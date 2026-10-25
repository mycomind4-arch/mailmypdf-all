import { createFileRoute } from "@tanstack/react-router";
import { getConfig } from "@/config";
import { sweepFactoryRemoteCi } from "@/studio/factory-ci-scheduler";
import { listPersistentPendingRemoteFactoryJobs } from "@/studio/factory-job.server";
import { syncRemoteFactoryAcceptance } from "@/studio/factory-remote-executor.server";
import { attachRequestId, createRequestLogger, getOrCreateRequestId } from "@/lib/request-id";

/**
 * Internal scheduler only. Advances already-reviewed remote proposals from
 * acceptance into publication review when exact GitHub CI evidence is green.
 * It never creates, approves, merges, deploys, charges or mails anything.
 */
export const Route = createFileRoute("/api/internal/factory-ci-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);
        const secret = getConfig().jobs.cleanupSecret;
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
          log.warn("unauthorized factory CI scheduler request");
          return attachRequestId(new Response("Unauthorized", { status: 401 }), requestId);
        }

        try {
          const summary = await sweepFactoryRemoteCi({
            limit: 20,
            list: listPersistentPendingRemoteFactoryJobs,
            sync: jobId => syncRemoteFactoryAcceptance({ jobId, actorId: null }),
            onError: (jobId, cause) => {
              log.error("factory CI reconciliation failed", {
                jobId,
                error: cause instanceof Error ? cause.message : String(cause),
              });
            },
          });

          // Fail the scheduler health check if any job's acceptance fails or
          // cannot be reconciled. Pending checks are normal (HTTP 200).
          const ok = summary.errors === 0 && summary.failedAcceptance === 0;
          return attachRequestId(
            Response.json({ ok, summary }, {
              status: ok ? 200 : 500,
              headers: { "Cache-Control": "no-store" },
            }),
            requestId,
          );
        } catch (cause) {
          log.error("factory CI scheduler failed", {
            error: cause instanceof Error ? cause.message : String(cause),
          });
          return attachRequestId(
            Response.json({ ok: false, error: "Factory CI scheduler failed" }, {
              status: 500,
              headers: { "Cache-Control": "no-store" },
            }),
            requestId,
          );
        }
      },
    },
  },
});
