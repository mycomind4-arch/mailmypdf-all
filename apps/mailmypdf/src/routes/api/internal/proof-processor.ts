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
            .limit(100);

          if (!error && expiredComms) {
            for (const comm of expiredComms) {
              const metadata = (comm.metadata as Record<string, unknown>) ?? {};
              if (metadata.window_expiry_notified === true) continue;

              const { data: tenant } = await supabaseAdmin
                .from("proof_tenants")
                .select("webhook_url, webhook_secret")
                .eq("id", comm.tenant_id)
                .maybeSingle();

              if (!tenant?.webhook_url) {
                await supabaseAdmin
                  .from("proof_communications")
                  .update({ metadata: { ...metadata, window_expiry_notified: true } })
                  .eq("id", comm.id);
                continue;
              }

              await dispatchWebhook(
                {
                  event_id: `evt_${comm.id}_window_expired`,
                  event_type: "response_window.expired",
                  timestamp: now,
                  data: { communication_id: comm.id, status: comm.status },
                },
                comm.tenant_id,
                tenant.webhook_url,
                tenant.webhook_secret,
                { supabaseAdmin },
                comm.id,
              ).catch(() => {});

              await supabaseAdmin
                .from("proof_communications")
                .update({ metadata: { ...metadata, window_expiry_notified: true } })
                .eq("id", comm.id);

              results.window_expiries++;
            }
          }
        } catch (e) {
          results.errors.push(`window_expiries: ${e instanceof Error ? e.message : String(e)}`);
        }

        log.info("proof-processor completed", results);

        const resp = Response.json({ ok: true, ...results });
        return attachRequestId(resp, requestId);
      },
    },
  },
});
