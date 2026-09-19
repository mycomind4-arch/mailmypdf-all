// Internal endpoint: process scheduled-delivery orders that are due.
// Protected by MAILMYPDF_CLEANUP_SECRET (same secret as draft cleanup).
import { createFileRoute } from "@tanstack/react-router";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";
import { getConfig } from "@/config";

export const Route = createFileRoute("/api/internal/process-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);

        // Auth check using centralized config
        const config = getConfig();
        const authHeader = request.headers.get("authorization");
        if (!config.jobs.cleanupSecret || authHeader !== `Bearer ${config.jobs.cleanupSecret}`) {
          log.warn("unauthorized access attempt");
          const resp = new Response("Unauthorized", { status: 401 });
          return attachRequestId(resp, requestId);
        }

        try {
          const { getDueScheduledOrders, submitOrderToLob } = await import("@/lib/lob.server");
          const { flags } = await import("@/lib/feature-flags");

          if (!flags.isLobEnabled()) {
            const resp = Response.json({ ok: true, message: "Lob not configured — skipping" });
            return attachRequestId(resp, requestId);
          }

          const orderIds = await getDueScheduledOrders();
          log.info("processing scheduled orders", { count: orderIds.length });
          const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];

          for (const orderId of orderIds) {
            try {
              await submitOrderToLob(orderId);
              results.push({ orderId, ok: true });
              log.info("scheduled order submitted", { orderId });
            } catch (e) {
              results.push({ orderId, ok: false, error: e instanceof Error ? e.message : String(e) });
              log.error("scheduled order failed", { orderId, error: e instanceof Error ? e.message : String(e) });
            }
          }

          const resp = Response.json({
            ok: true,
            processed: results.filter((r) => r.ok).length,
            failed: results.filter((r) => !r.ok).length,
            results,
          });
          return attachRequestId(resp, requestId);
        } catch (e) {
          log.error("process-scheduled error", { error: e instanceof Error ? e.message : String(e) });
          const resp = new Response("Internal error", { status: 500 });
          return attachRequestId(resp, requestId);
        }
      },
    },
  },
});
