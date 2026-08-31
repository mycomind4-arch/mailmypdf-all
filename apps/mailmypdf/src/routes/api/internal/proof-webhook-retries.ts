// Internal endpoint: process pending proof-of-service webhook retries.
// Protected by MAILMYPDF_CLEANUP_SECRET (same secret as other internal jobs).
//
// Call this from a cron scheduler (e.g., every 5 minutes).
// It picks up webhook deliveries with status='retrying' whose next_retry_at
// has passed and re-attempts them.

import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";
import { getConfig } from "@/config";

export const Route = createFileRoute("/api/internal/proof-webhook-retries")({
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
          const { processPendingRetries } = await import("@/lib/proof-of-service/webhooks");

          const processed = await processPendingRetries({ supabaseAdmin });

          log.info("proof-of-service webhook retries processed", { count: processed });

          const resp = Response.json({
            ok: true,
            processed,
          });
          return attachRequestId(resp, requestId);
        } catch (e) {
          log.error("proof-webhook-retries error", {
            error: e instanceof Error ? e.message : String(e),
          });
          const resp = new Response("Internal error", { status: 500 });
          return attachRequestId(resp, requestId);
        }
      },
    },
  },
});
