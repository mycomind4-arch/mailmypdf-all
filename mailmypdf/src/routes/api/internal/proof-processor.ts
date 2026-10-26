// Internal endpoint: combined Proof-of-Service maintenance processor.
// Protected by MAILMYPDF_CLEANUP_SECRET.
//
// Runs all PoS maintenance tasks in a single call — ideal for a single
// cron trigger every 5 minutes.
//
// Tasks:
// 1. Process pending webhook retries
// 2. Check expired response windows
// 3. (Future) Reconcile stale communications with Lob

import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";
import { getConfig } from "@/config";
import type { CommunicationStatus } from "@/lib/proof-of-service/types";
import { requireProofWindowRows, UNNOTIFIED_PROOF_WINDOW_FILTER } from "@/lib/proof-of-service/proof-window-query";
import { completeExpiryNotification, requireExpiryTenant, processExpiryBatch } from "@/lib/proof-of-service/expiry-notification";

export const Route = createFileRoute("/api/internal/proof-processor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);

        // Auth check
        const config = getConfig();
        const authHeader = request.headers.get("authorization");
        if (!config.jobs.cleanupSecret || authHeader !== `Bearer ${config.jobs.cleanupSecret}`) {
          log.warn("unauthorized access attempt");
          const resp = new Response("Unauthorized", { status: 401 });
          return attachRequestId(resp, requestId);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results = {
          webhook_retries: 0,
          window_expiries: 0,
          errors: [] as string[],
        };

        // 1. Process pending webhook retries
        try {
          const { processPendingRetries } = await import("@/lib/proof-of-service/webhooks");
          results.webhook_retries = await processPendingRetries({ supabaseAdmin });
        } catch (e) {
          results.errors.push(`webhook_retries: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 2. Check expired response windows
        try {
          const { dispatchWebhook } = await import("@/lib/proof-of-service/webhooks");
          const now = new Date().toISOString();

          const { data: expiredComms, error } = await supabaseAdmin
            .from("proof_communications")
            .select("id, tenant_id, status, legal_reference, metadata")
            .eq("status", "delivered")
            .not("legal_reference->>response_window_ends", "is", null)
            .lt("legal_reference->>response_window_ends", now)
            // Filter in SQL, before LIMIT: otherwise 100 previously notified rows
            // can indefinitely starve later, still-unnotified communications.
            .or(UNNOTIFIED_PROOF_WINDOW_FILTER)
            .limit(100);

          const rows = requireProofWindowRows({ data: expiredComms, error });
          const batch = await processExpiryBatch(rows, async (comm) => {
              const metadata = (comm.metadata as Record<string, unknown>) ?? {};
              if (metadata.window_expiry_notified === true) return false;

              const { data: tenant, error: tenantError } = await supabaseAdmin
                .from("proof_tenants")
                .select("webhook_url, webhook_secret")
                .eq("id", comm.tenant_id)
                .maybeSingle();

              const verifiedTenant = requireExpiryTenant({ data: tenant, error: tenantError });

              const markNotified = () => supabaseAdmin
                .from("proof_communications")
                .update({ metadata: { ...metadata, window_expiry_notified: true } })
                .eq("id", comm.id)
                .select("id")
                .maybeSingle();

              if (!verifiedTenant.webhook_url) {
                await completeExpiryNotification({ markNotified });
                return true;
              }

              await completeExpiryNotification({
                dispatch: () => dispatchWebhook(
                  {
                    event_id: `evt_${comm.id}_window_expired`,
                    event_type: "response_window.expired",
                    timestamp: now,
                    data: { communication_id: comm.id, status: comm.status as CommunicationStatus },
                  },
                  comm.tenant_id,
                  verifiedTenant.webhook_url,
                  verifiedTenant.webhook_secret,
                  { supabaseAdmin },
                  comm.id,
                ),
                markNotified,
              });

              return true;
          });
          results.window_expiries += batch.completed;
          for (const error of batch.errors) {
            results.errors.push(`window_expiries: ${error.message}`);
          }
        } catch (e) {
          results.errors.push(`window_expiries: ${e instanceof Error ? e.message : String(e)}`);
        }

        const ok = results.errors.length === 0;
        if (ok) log.info("proof-processor completed", results);
        else log.error("proof-processor completed with errors", results);

        const resp = Response.json({ ok, ...results }, { status: ok ? 200 : 500 });
        return attachRequestId(resp, requestId);
      },
    },
  },
});
