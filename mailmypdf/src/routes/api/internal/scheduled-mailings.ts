import { createFileRoute } from "@tanstack/react-router";
import { getConfig } from "@/config";
import {
  processDueScheduledMailings,
  processScheduledMailing,
  ScheduledMailError,
} from "@/lib/scheduled-mail.server";
import { attachRequestId, createRequestLogger, getOrCreateRequestId } from "@/lib/request-id";

export const Route = createFileRoute("/api/internal/scheduled-mailings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);
        const authHeader = request.headers.get("authorization");
        const secret = getConfig().jobs.cleanupSecret;
        if (!secret || authHeader !== "Bearer " + secret) {
          log.warn("unauthorized scheduled-mail job request");
          return attachRequestId(new Response("Unauthorized", { status: 401 }), requestId);
        }

        try {
          const body = await request.json().catch(() => ({})) as Record<string, unknown>;
          const scheduleId =
            typeof body.schedule_id === "string" && body.schedule_id.trim()
              ? body.schedule_id.trim()
              : null;
          const limit =
            typeof body.limit === "number" && Number.isInteger(body.limit)
              ? body.limit
              : 25;

          const result = scheduleId
            ? await processScheduledMailing(scheduleId)
            : await processDueScheduledMailings(limit);

          // A due batch handles individual failures without throwing so other
          // schedules can continue. Do not report the batch as healthy when
          // any attempted execution failed: monitoring must retry/escalate.
          // Explicitly deferred schedules are not failures.
          if ("results" in result && result.results.some((entry) => entry.error)) {
            log.error("scheduled mailing batch contained failed executions");
            return attachRequestId(
              Response.json({ ok: false, error: "Scheduled mailing processing failed" }, { status: 500 }),
              requestId,
            );
          }

          log.info("scheduled mail job processed", {
            scheduleId,
            dueBatch: !scheduleId,
          });
          return attachRequestId(Response.json({ ok: true, result }), requestId);
        } catch (error) {
          const status = error instanceof ScheduledMailError ? error.status : 500;
          log.error("scheduled mail job failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          return attachRequestId(
            Response.json(
              { ok: false, error: error instanceof Error ? error.message : "Scheduled mail job failed" },
              { status },
            ),
            requestId,
          );
        }
      },
    },
  },
});
