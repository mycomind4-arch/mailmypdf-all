/**
 * Proof-of-Service — Webhook Dispatcher
 *
 * Pushes delivery lifecycle events to the tenant's registered webhook URL.
 * Signs payloads with HMAC-SHA256 for verification by the tenant.
 * Retries with exponential backoff.
 */

import { createHmac } from "node:crypto";
import type { WebhookEvent, WebhookEventType } from "./types";
import { embeddedOne } from "./embedded";
import { requireWebhookRetryRows } from "./webhook-retry-query";

interface WebhookDeliveryRecord {
  id: string;
  tenant_id: string;
  communication_id: string;
  event_type: WebhookEventType;
  event_id: string;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  next_retry_at: string | null;
}

const MAX_ATTEMPTS = 5;

/**
 * A webhook delivery is only durable when its status transition is persisted.
 * Never treat a failed status write as a successful delivery or queued retry.
 */
async function persistWebhookDeliveryStatus(
  supabaseAdmin: import("@supabase/supabase-js").SupabaseClient,
  eventId: string,
  values: {
    status: "delivered" | "failed" | "retrying";
    attempts: number;
    response_code: number | null;
    next_retry_at?: string;
  },
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("proof_webhook_deliveries")
    .update(values)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `Failed to persist proof webhook ${values.status} status: ${error?.message ?? "no matching delivery record"}`,
    );
  }
}

/**
 * Dispatch a webhook event to the tenant's webhook URL.
 * Creates a delivery record for retry tracking.
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  tenantId: string,
  webhookUrl: string,
  webhookSecret: string | null,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  communicationId: string,
): Promise<void> {
  const { supabaseAdmin } = deps;
  const eventId = event.event_id;

  // Insert delivery record (idempotent — skip if already exists)
  const { error: insertError } = await supabaseAdmin
    .from("proof_webhook_deliveries")
    .insert({
      tenant_id: tenantId,
      communication_id: communicationId,
      event_type: event.event_type,
      event_id: eventId,
      payload: event,
      status: "pending",
    });

  if (insertError) {
    // If duplicate event_id, skip — already delivered or in progress
    if (insertError.code === "23505") return;
    throw new Error(`Failed to create webhook delivery: ${insertError.message}`);
  }

  // Attempt delivery
  await attemptWebhookDelivery(event, tenantId, webhookUrl, webhookSecret, deps, eventId);
}

/**
 * Attempt to deliver a webhook event.
 * On failure, schedules a retry.
 */
async function attemptWebhookDelivery(
  event: WebhookEvent,
  tenantId: string,
  webhookUrl: string,
  webhookSecret: string | null,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  eventId: string,
  attempt = 1,
): Promise<void> {
  const { supabaseAdmin } = deps;
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Sign the payload
  const signature = webhookSecret
    ? createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${body}`)
        .digest("hex")
    : "";

  const signatureHeader = `t=${timestamp},v1=${signature}`;

  // Only network failures are retriable here. A database write failure after
  // HTTP 2xx must propagate, not be mistaken for a network failure.
  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ProofOfService-Signature": signatureHeader,
        "X-ProofOfService-Event": event.event_type,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
  } catch {
    await handleWebhookFailure(event, tenantId, webhookUrl, webhookSecret, deps, eventId, attempt, null);
    return;
  }

  if (response.ok) {
    await persistWebhookDeliveryStatus(supabaseAdmin, eventId, {
      status: "delivered",
      attempts: attempt,
      response_code: response.status,
    });
  } else {
    await handleWebhookFailure(event, tenantId, webhookUrl, webhookSecret, deps, eventId, attempt, response.status);
  }
}

/**
 * Handle a failed webhook delivery — retry with backoff or mark as failed.
 */
async function handleWebhookFailure(
  event: WebhookEvent,
  tenantId: string,
  webhookUrl: string,
  webhookSecret: string | null,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  eventId: string,
  attempt: number,
  responseCode: number | null,
): Promise<void> {
  const { supabaseAdmin } = deps;

  if (attempt >= MAX_ATTEMPTS) {
    // Give up
    await persistWebhookDeliveryStatus(supabaseAdmin, eventId, {
      status: "failed",
      attempts: attempt,
      response_code: responseCode,
    });
    return;
  }

  // Schedule retry with exponential backoff
  // Backoff: 1min, 5min, 30min, 2hr (attempts 1-4)
  const backoffMs = [60_000, 300_000, 1_800_000, 7_200_000][attempt - 1] ?? 7_200_000;
  const nextRetry = new Date(Date.now() + backoffMs).toISOString();

  await persistWebhookDeliveryStatus(supabaseAdmin, eventId, {
    status: "retrying",
    attempts: attempt,
    next_retry_at: nextRetry,
    response_code: responseCode,
  });

  // Note: actual retry execution would be handled by a scheduled job
  // that picks up records with status='retrying' and next_retry_at <= now
}

/**
 * Process pending webhook retries.
 * Called by a scheduled job or cron.
 */
export async function processPendingRetries(
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<number> {
  const { supabaseAdmin } = deps;
  const now = new Date().toISOString();

  // Find deliveries that need retry
  const { data: pending, error } = await supabaseAdmin
    .from("proof_webhook_deliveries")
    .select(`
      event_id,
      event_type,
      payload,
      attempts,
      tenant_id,
      proof_tenants!inner (webhook_url, webhook_secret)
    `)
    .eq("status", "retrying")
    .lte("next_retry_at", now)
    .limit(50);

  const retryRows = requireWebhookRetryRows({ data: pending, error });

  // A crash or failed status write after inserting a delivery can leave it
  // permanently "pending". The retrying-only scan never recovers those rows.
  // Give in-flight first attempts five minutes to finish before replaying.
  // Webhooks are at-least-once; consumers must deduplicate by event_id.
  const staleCutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: stalePending, error: pendingError } = await supabaseAdmin
    .from("proof_webhook_deliveries")
    .select(`
      event_id,
      event_type,
      payload,
      attempts,
      tenant_id,
      proof_tenants!inner (webhook_url, webhook_secret)
    `)
    .eq("status", "pending")
    .lte("created_at", staleCutoff)
    .limit(50);

  const pendingRows = requireWebhookRetryRows({ data: stalePending, error: pendingError });

  let processed = 0;
  for (const record of [
    ...retryRows.map((row) => ({ row, attempt: (row.attempts as number) + 1 })),
    ...pendingRows.map((row) => ({ row, attempt: 1 })),
  ]) {
    const { row, attempt } = record;
    const tenant = embeddedOne<Record<string, unknown>>(row.proof_tenants);
    const webhookUrl = tenant?.webhook_url as string | undefined;
    const webhookSecret = (tenant?.webhook_secret ?? null) as string | null;

    if (!webhookUrl) continue;

    const event = row.payload as WebhookEvent;
    await attemptWebhookDelivery(
      event,
      row.tenant_id as string,
      webhookUrl,
      webhookSecret,
      deps,
      row.event_id as string,
      attempt,
    );
    processed++;
  }

  return processed;
}
