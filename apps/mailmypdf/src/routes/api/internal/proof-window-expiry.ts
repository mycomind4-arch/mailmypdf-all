// Internal endpoint: check expired response windows for proof-of-service
// communications.
// Protected by MAILMYPDF_CLEANUP_SECRET (same secret as other internal jobs).
//
// Call this from a cron scheduler (e.g., every hour).
// It finds communications where:
//   1. A response window was specified (response_window_days > 0)
//   2. The window has expired (response_window_ends < now)
//   3. The communication was delivered
//   4. The expiry webhook hasn't been sent yet
// And dispatches the response_window.expired webhook.

import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";
import { getConfig } from "@/config";
import type { CommunicationStatus } from "@/lib/proof-of-service/types";

export const Route = createFileRoute("/api/internal/proof-window-expiry")({
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

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { dispatchWebhook } = await import("@/lib/proof-of-service/webhooks");

          const now = new Date().toISOString();

          // Find delivered communications with expired response windows
          // where we haven't already sent the expiry webhook.
          //
          // We use the metadata field to track whether we've sent the expiry
          // notification: metadata->window_expiry_notified = true
          const { data: expiredComms, error } = await supabaseAdmin
            .from("proof_communications")
            .select(`
              id,
              tenant_id,
              status,
              sent_at,
              delivered_at,
              legal_reference,
              metadata
            `)
            .eq("status", "delivered")
            .not("legal_reference->>response_window_ends", "is", null)
            .lt("legal_reference->>response_window_ends", now)
            .limit(100);

          if (error) {
            log.error("proof-window-expiry query error", { error: error.message });
            const resp = new Response("Internal error", { status: 500 });
            return attachRequestId(resp, requestId);
          }

          let processed = 0;
          let skipped = 0;

          for (const comm of expiredComms ?? []) {
            // Check if we already notified about this expiry
            const metadata = (comm.metadata as Record<string, unknown>) ?? {};
            if (metadata.window_expiry_notified === true) {
              skipped++;
              continue;
            }

            // Get the tenant's webhook config
            const { data: tenant } = await supabaseAdmin
              .from("proof_tenants")
              .select("webhook_url, webhook_secret")
              .eq("id", comm.tenant_id)
              .maybeSingle();

            if (!tenant?.webhook_url) {
              // No webhook configured — mark as notified so we don't keep checking
              await supabaseAdmin
                .from("proof_communications")
                .update({
                  metadata: { ...metadata, window_expiry_notified: true },
                })
                .eq("id", comm.id);
              skipped++;
              continue;
            }

            // Dispatch the expiry webhook
            await dispatchWebhook(
              {
                event_id: `evt_${comm.id}_window_expired`,
                event_type: "response_window.expired",
                timestamp: now,
                data: {
                  communication_id: comm.id,
                  status: comm.status as CommunicationStatus,
                },
              },
              comm.tenant_id,
              tenant.webhook_url,
              tenant.webhook_secret,
              { supabaseAdmin },
              comm.id,
            ).catch(() => {
              // Webhook failures are non-fatal — retry happens async
            });

            // Mark as notified
            await supabaseAdmin
              .from("proof_communications")
              .update({
                metadata: { ...metadata, window_expiry_notified: true },
              })
              .eq("id", comm.id);

            processed++;
          }

          log.info("proof-window-expiry processed", { processed, skipped, total: expiredComms?.length ?? 0 });

          const resp = Response.json({
            ok: true,
            processed,
            skipped,
            total: expiredComms?.length ?? 0,
          });
          return attachRequestId(resp, requestId);
        } catch (e) {
          log.error("proof-window-expiry error", {
            error: e instanceof Error ? e.message : String(e),
          });
          const resp = new Response("Internal error", { status: 500 });
          return attachRequestId(resp, requestId);
        }
      },
    },
  },
});
