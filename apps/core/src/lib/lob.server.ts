// Server-only Lob client.
// Do NOT import from route files or *.functions.ts at module scope — load inside handlers.

import { getConfig } from "@/config";
import { flags } from "@/lib/feature-flags";
import {
  type OrderStatus,
  type TransitionContext,
  canTransition,
  isSubmittableStatus,
  getFulfillmentProgress,
} from "@/lib/order-state-machine";
import { logWebhook, logRequest, logAddressValidation } from "@/lib/request-logging";
import { withRetry, type RetryOptions } from "@/lib/retry";
import { validateUsAddress } from "@/lib/address-validation";
import { recordOrderEvent, recordFulfillmentTime } from "@/lib/metrics";

const LOB_BASE = "https://api.lob.com/v1";

// ── Feature Flag Backed Checks (backward-compatible re-exports) ──────────────

/** @deprecated Use `flags.isLobEnabled()` from `@/lib/feature-flags` instead. */
export function isLobConfigured(): boolean {
  return flags.isLobEnabled();
}

/** @deprecated Use `flags.isAutoSubmitEnabled()` from `@/lib/feature-flags` instead. */
export function autoSubmitEnabled(): boolean {
  return flags.isAutoSubmitEnabled();
}

function basicAuth(): string {
  const config = getConfig();
  if (!config.lob.apiKey) throw new Error("LOB_API_KEY is not configured");
  // Lob uses HTTP Basic with the API key as username and empty password.
  return "Basic " + Buffer.from(`${config.lob.apiKey}:`).toString("base64");
}

type LobAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
};

export type LobLetter = {
  id: string;
  status?: string | null;
  expected_delivery_date?: string | null;
  tracking_number?: string | null;
  url?: string | null;
};

export type MailClass = "standard" | "certified" | "registered";

export async function createLobLetter(args: {
  orderId: string;
  pdfUrl: string; // publicly-fetchable signed URL
  to: LobAddress;
  from: LobAddress;
  description?: string;
  idempotencyKey: string;
  color?: boolean;
  extraService?: MailClass; // "certified" or "registered" for premium delivery
  /** Optional per-tenant Lob API key. Falls back to platform LOB_API_KEY. */
  apiKey?: string;
}): Promise<LobLetter> {
  const form = new URLSearchParams();
  form.set("description", args.description || `MailMyPDF order ${args.orderId.slice(0, 8)}`);
  form.set("file", args.pdfUrl);
  form.set("color", args.color ? "true" : "false");
  form.set("double_sided", "false");
  form.set("address_placement", "top_first_page");
  form.set("use_type", "operational");
  form.set("metadata[orderId]", args.orderId);

  // Extra service for tracking/premium delivery
  if (args.extraService === "certified") {
    form.set("extra_service", "certified");
  } else if (args.extraService === "registered") {
    form.set("extra_service", "registered");
  }

  const setAddress = (prefix: "to" | "from", a: LobAddress) => {
    form.set(`${prefix}[name]`, a.name);
    form.set(`${prefix}[address_line1]`, a.line1);
    if (a.line2) form.set(`${prefix}[address_line2]`, a.line2);
    form.set(`${prefix}[address_city]`, a.city);
    form.set(`${prefix}[address_state]`, a.state);
    form.set(`${prefix}[address_zip]`, a.postal);
    form.set(`${prefix}[address_country]`, "US");
  };
  setAddress("to", args.to);
  setAddress("from", args.from);

  const LOB_RETRY: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    timeoutMs: 30000,
    onRetry: (info) => {
      logRequest.retry({
        provider: "lob",
        operation: "createLetter",
        attempt: info.attempt,
        error: info.error,
        delayMs: info.delayMs,
        orderId: args.orderId,
      });
    },
  };

  const reqCtx = logRequest.start({
    provider: "lob",
    operation: "createLetter",
    method: "POST",
    url: `${LOB_BASE}/letters`,
    orderId: args.orderId,
  });

  const parsed = await withRetry(async (attempt) => {
    const res = await fetch(`${LOB_BASE}/letters`, {
      method: "POST",
      headers: {
        Authorization: args.apiKey
          ? "Basic " + Buffer.from(`${args.apiKey}:`).toString("base64")
          : basicAuth(),
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": args.idempotencyKey,
      },
      body: form.toString(),
      signal: AbortSignal.timeout(30000),
    });

    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { /* keep raw */ }

    if (!res.ok) {
      const msg = body?.error?.message || text.slice(0, 300) || `Lob ${res.status}`;
      logRequest.end(reqCtx, { status: res.status, message: `attempt ${attempt} failed: ${msg}`, error: msg });

      if (res.status === 429 || res.status >= 500) {
        const err = new Error(`Lob create letter failed: ${msg}`) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      throw new Error(`Lob create letter failed: ${msg}`);
    }

    logRequest.end(reqCtx, { status: res.status, message: `letter created (attempt ${attempt})` });
    return body;
  }, LOB_RETRY);

  // Idempotency verification
  if (!parsed?.id) {
    throw new Error("Lob returned no letter id — possible API contract change");
  }

  return {
    id: parsed.id,
    status: parsed.send_date ? "processed" : parsed.status ?? null,
    expected_delivery_date: parsed.expected_delivery_date ?? null,
    tracking_number: parsed.tracking_number ?? null,
    url: parsed.url ?? null,
  };
}

// Lob signs webhooks with HMAC-SHA256 over `${timestamp}.${rawBody}`
// using the endpoint's secret. Headers: `lob-signature`, `lob-signature-timestamp`.
export async function verifyLobWebhook(req: Request): Promise<{ event: any; raw: string }> {
  const config = getConfig();
  const secret = config.lob.webhookSecret;
  if (!secret) throw new Error("LOB_WEBHOOK_SECRET is not configured");
  const signature = req.headers.get("lob-signature");
  const timestamp = req.headers.get("lob-signature-timestamp");
  const raw = await req.text();
  if (!signature || !timestamp) throw new Error("Missing Lob signature headers");

  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) throw new Error("Lob webhook timestamp out of tolerance");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");

  // Timing-safe compare
  if (expected.length !== signature.length) throw new Error("Invalid Lob signature");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) throw new Error("Invalid Lob signature");

  return { event: JSON.parse(raw), raw };
}

// Maps a Lob letter status/event to our internal order_status enum.
export function mapLobStatusToOrderStatus(
  lobStatus: string | null | undefined,
): OrderStatus | null {
  if (!lobStatus) return null;
  switch (lobStatus) {
    case "created":
    case "rendered":
    case "processed":
    case "printed":
      return "provider_processing";
    case "mailed":
      return "mailed";
    case "in_transit":
    case "in_local_area":
    case "processed_for_delivery":
    case "re-routed":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "returned":
    case "returned_to_sender":
      return "returned";
    case "failed":
    case "error":
    case "cancelled":
      return "failed_provider_submission";
    default:
      return null;
  }
}

// Attempts full auto-submit: signs the stored PDF, sends to Lob, updates the
// order, and logs order_events. Idempotent — if the order already has a
// lob_letter_id, we skip. On error we mark for manual fallback and rethrow.
export async function submitOrderToLob(orderId: string): Promise<{ lobLetterId: string } | { skipped: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Order not found");
  if (order.lob_letter_id) return { skipped: true };

  // Check if this is a scheduled delivery that hasn't reached its date yet
  if (order.scheduled_delivery_date) {
    const scheduled = new Date(order.scheduled_delivery_date);
    if (scheduled > new Date()) {
      return { skipped: true };
    }
  }

  // Use the state machine to validate the current status is submittable
  const currentStatus = order.status as OrderStatus;
  if (!isSubmittableStatus(currentStatus)) {
    throw new Error(`Order ${orderId} is not in a submittable state (${currentStatus})`);
  }

  // Signed URL valid for 1 hour — Lob fetches the file server-side.
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("order-pdfs")
    .createSignedUrl(order.pdf_storage_path, 3600);
  if (signErr || !signed) throw new Error(`Could not sign PDF: ${signErr?.message ?? "unknown"}`);

  // Map mail_class to Lob extra_service
  const mailClass = (order.mail_class || "standard") as MailClass;
  const extraService = mailClass === "standard" ? undefined : mailClass;

  try {
    const letter = await createLobLetter({
      orderId,
      pdfUrl: signed.signedUrl,
      idempotencyKey: `order_${orderId}`,
      color: order.color ?? false,
      extraService,
      to: {
        name: order.recipient_name,
        line1: order.recipient_line1,
        line2: order.recipient_line2,
        city: order.recipient_city,
        state: order.recipient_state,
        postal: order.recipient_postal,
      },
      from: {
        name: order.sender_name,
        line1: order.sender_line1,
        line2: order.sender_line2,
        city: order.sender_city,
        state: order.sender_state,
        postal: order.sender_postal,
      },
    });

    // Conditional update: only transition if lob_letter_id is still null.
    // Use the state machine to validate the transition.
    const targetStatus: OrderStatus = "submitted_to_provider";
    if (!canTransition(currentStatus, targetStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${targetStatus}`);
    }

    const { data: updated } = await supabaseAdmin
      .from("orders")
      .update({ status: targetStatus, lob_letter_id: letter.id })
      .eq("id", orderId)
      .is("lob_letter_id", null)
      .select("id");

    if (updated && updated.length > 0) {
      await supabaseAdmin.from("order_events").insert({
        order_id: orderId,
        type: "lob.submitted",
        label: "Submitted to Lob for printing & mailing",
        metadata: {
          lob_letter_id: letter.id,
          expected_delivery_date: letter.expected_delivery_date,
          color: order.color ?? false,
          mail_class: order.mail_class ?? "standard",
        },
      });

      // Record margin (Lob cost vs. order price)
      // Lob doesn't always return cost in the letter response; we log what we can
      await recordLobCost(
        orderId,
        letter.id,
        null, // Lob cost not available in letter creation response
        order.price_cents ?? 0,
        order.mail_class ?? "standard",
        order.color ?? false,
      );

      // Record business metrics
      recordOrderEvent("submitted", orderId);
      if (order.created_at) {
        const minutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
        recordFulfillmentTime(Math.max(0, minutes));
      }
    }

    return { lobLetterId: letter.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("order_events").insert({
      order_id: orderId,
      type: "lob.submit_failed",
      label: "Lob submission failed — needs manual review",
      metadata: { error: message },
    });
    // Leave status as paid_pending_manual_fulfillment so admin can process manually.
    throw e;
  }
}

// Shared Lob webhook processor — used by both /api/public/lob/webhook and
// /api/public/lob-webhook.
export async function processLobWebhook(request: Request): Promise<Response> {
  try {
    const { event } = await verifyLobWebhook(request);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendMailedEmail } = await import("@/lib/email.server");

    const eventTypeId: string = event?.event_type?.id ?? event?.event_type ?? "";
    const letter = event?.body ?? {};
    const letterId: string | undefined = letter?.id;
    if (!letterId || !eventTypeId.startsWith("letter.")) {
      logWebhook({ provider: "lob", eventType: eventTypeId, message: "ignoring non-letter event", level: "debug" });
      return Response.json({ received: true, ignored: true });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("lob_letter_id", letterId)
      .maybeSingle();
    if (!order) {
      // Not a consumer order — check if it's a proof-of-service communication
      const { handleProofOfServiceLobEvent } = await import("@/lib/proof-of-service/lob-webhook-bridge");
      const lobStatus = eventTypeId.replace("letter.", "");
      const externalId = event?.id ?? null;

      // Extract signature image URL if present (for certified mail delivery)
      const signatureImageUrl =
        letter?.tracking_events?.find((e: Record<string, unknown>) =>
          (e as { event_type?: string })?.event_type === "delivered"
        )?.signature_url ?? null;

      const handled = await handleProofOfServiceLobEvent(letterId, lobStatus, externalId, signatureImageUrl, { supabaseAdmin });
      if (handled) {
        return Response.json({ received: true, proof_of_service: true });
      }

      logWebhook({ provider: "lob", eventType: eventTypeId, message: `no order or proof-of-service record found for letter ${letterId}`, level: "warn", metadata: { letterId } });
      return Response.json({ received: true, unmatched: true });
    }

    const externalId = event?.id ?? null;
    if (externalId) {
      const { data: existing } = await supabaseAdmin
        .from("order_events")
        .select("id")
        .eq("order_id", order.id)
        .eq("type", `lob.${eventTypeId}`)
        .contains("metadata", { external_id: externalId })
        .limit(1)
        .maybeSingle();
      if (existing) return Response.json({ received: true, duplicate: true });
    }

    // Note: TrackingService (src/services/tracking.service.ts) wraps this
    // transition logic with StateMachineService for atomic updates. The
    // existing inline logic is kept here because it includes progress-check
    // (only advance forward) and email notification that the service doesn't
    // handle yet. Future refactoring can migrate this to TrackingService.
    const lobStatus = eventTypeId.replace("letter.", "");
    const nextStatus = mapLobStatusToOrderStatus(lobStatus);
    const currentStatus = order.status as OrderStatus;

    if (nextStatus) {
      // Use the state machine to validate the transition
      if (canTransition(currentStatus, nextStatus)) {
        // Only advance if the next status is further in the fulfillment pipeline
        const currentProgress = getFulfillmentProgress(currentStatus);
        const nextProgress = getFulfillmentProgress(nextStatus);

        if (nextProgress > currentProgress || nextStatus === "returned" || nextStatus === "failed_provider_submission") {
          const update: { status: OrderStatus; mailed_at?: string } = { status: nextStatus };
          if (nextStatus === "mailed") update.mailed_at = new Date().toISOString();
          await supabaseAdmin.from("orders").update(update).eq("id", order.id);
        }
      } else {
        logWebhook({ provider: "lob", eventType: eventTypeId, orderId: order.id, message: `invalid transition ${currentStatus} → ${nextStatus}, skipping status update`, level: "warn", metadata: { currentStatus, nextStatus } });
      }
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      type: `lob.${eventTypeId}`,
      label: lobStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      metadata: { external_id: externalId },
    });

    if (nextStatus === "mailed") {
      await sendMailedEmail(supabaseAdmin, order.id);
    }

    return Response.json({ received: true });
  } catch (e) {
    logWebhook({ provider: "lob", eventType: "error", message: `webhook processing error: ${e instanceof Error ? e.message : String(e)}`, level: "error" });
    return new Response("Webhook error", { status: 400 });
  }
}

// Query all scheduled-delivery orders that are due for submission to Lob.
// Used by the scheduled-delivery workflow / cron job.
export async function getDueScheduledOrders(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("status", "paid_pending_manual_fulfillment")
    .not("scheduled_delivery_date", "is", null)
    .lte("scheduled_delivery_date", new Date().toISOString())
    .is("lob_letter_id", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o: any) => o.id);
}

// ── Webhook Recovery ──────────────────────────────────────────────────────────
//
// If we suspect we missed a Lob webhook (e.g., a deployed order has been in
// "submitted_to_provider" for too long), we can poll Lob's API directly to
// get the current letter status and reconcile our database.
//
// This is the "pull" fallback for when the "push" (webhook) path fails.

export type ReconciliationResult = {
  orderId: string;
  letterId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus | null;
  updated: boolean;
  eventsInserted: number;
};

/**
 * Reconcile a single order's status by polling Lob directly.
 * Use when a webhook may have been missed or for scheduled health checks.
 */
export async function reconcileOrderWithLob(orderId: string): Promise<ReconciliationResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, lob_letter_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (!order.lob_letter_id) {
    return {
      orderId,
      letterId: "",
      previousStatus: order.status as OrderStatus,
      newStatus: null,
      updated: false,
      eventsInserted: 0,
    };
  }

  // Query Lob directly for the letter status
  const config = getConfig();
  const lobKey = config.lob.apiKey;
  if (!lobKey) throw new Error("LOB_API_KEY not configured");

  const auth = "Basic " + Buffer.from(`${lobKey}:`).toString("base64");
  const res = await fetch(`https://api.lob.com/v1/letters/${order.lob_letter_id}`, {
    method: "GET",
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lob reconciliation failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const letter = await res.json();
  const lobStatus = letter.status ?? null;
  const nextStatus = mapLobStatusToOrderStatus(lobStatus);
  const currentStatus = order.status as OrderStatus;

  let updated = false;
  let eventsInserted = 0;

  if (nextStatus && canTransition(currentStatus, nextStatus)) {
    const currentProgress = getFulfillmentProgress(currentStatus);
    const nextProgress = getFulfillmentProgress(nextStatus);

    if (nextProgress > currentProgress || nextStatus === "returned" || nextStatus === "failed_provider_submission") {
      const update: { status: OrderStatus; mailed_at?: string } = { status: nextStatus };
      if (nextStatus === "mailed") update.mailed_at = new Date().toISOString();
      await supabaseAdmin.from("orders").update(update).eq("id", order.id);
      updated = true;

      // Insert an order event for the reconciliation
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        type: `lob.reconciled.${lobStatus}`,
        label: `Status reconciled via Lob API: ${lobStatus}`,
        metadata: {
          letter_id: order.lob_letter_id,
          previous_status: currentStatus,
          new_status: nextStatus,
          source: "reconciliation",
        },
      });
      eventsInserted = 1;

      logWebhook({
        provider: "lob",
        eventType: `reconciled.${lobStatus}`,
        orderId: order.id,
        externalId: order.lob_letter_id,
        message: `Reconciled order ${order.id}: ${currentStatus} → ${nextStatus}`,
        level: "info",
      });

      // Send mailed email if the new status is mailed
      if (nextStatus === "mailed") {
        const { sendMailedEmail } = await import("@/lib/email.server");
        await sendMailedEmail(supabaseAdmin, order.id);
      }
    }
  }

  return {
    orderId: order.id,
    letterId: order.lob_letter_id,
    previousStatus: currentStatus,
    newStatus: nextStatus,
    updated,
    eventsInserted,
  };
}

/**
 * Find orders that may have missed webhooks — orders in a non-terminal
 * fulfillment state that haven't been updated in a while.
 *
 * Returns order IDs that should be reconciled.
 */
export async function getOrdersNeedingReconciliation(opts?: {
  staleHours?: number;
  batchLimit?: number;
}): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const staleHours = opts?.staleHours ?? 24;
  const batchLimit = opts?.batchLimit ?? 50;
  const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();

  // Orders that have a lob_letter_id but haven't been updated in staleHours
  // and are in a non-terminal fulfillment state
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id")
    .not("lob_letter_id", "is", null)
    .in("status", [
      "submitted_to_provider",
      "provider_processing",
      "mailed",
      "in_transit",
    ])
    .lt("updated_date", cutoff)
    .order("updated_date", { ascending: true })
    .limit(batchLimit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((o: any) => o.id);
}

// ── Margin Reporting ──────────────────────────────────────────────────────────
//
// Track Lob's cost for each letter against the order's price to monitor
// margins. Lob's API response includes pricing information we can log
// and aggregate.

export type LobMarginReport = {
  orderId: string;
  orderPriceCents: number;
  lobCostCents: number | null;
  marginCents: number | null;
  marginPct: number | null;
  mailClass: string;
  color: boolean;
};

/**
 * Record a Lob cost event for an order. Called after successful letter
 * creation to track the cost of fulfillment.
 */
export async function recordLobCost(
  orderId: string,
  letterId: string,
  lobCostCents: number | null,
  orderPriceCents: number,
  mailClass: string,
  color: boolean,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const marginCents = lobCostCents != null ? orderPriceCents - lobCostCents : null;
  const marginPct = lobCostCents != null && lobCostCents > 0
    ? Math.round((marginCents! / orderPriceCents) * 10000) / 100
    : null;

  await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    type: "lob.cost_report",
    label: `Lob cost: $${lobCostCents != null ? (lobCostCents / 100).toFixed(2) : "unknown"}`,
    metadata: {
      letter_id: letterId,
      lob_cost_cents: lobCostCents,
      order_price_cents: orderPriceCents,
      margin_cents: marginCents,
      margin_pct: marginPct,
      mail_class: mailClass,
      color,
    },
  });
}
