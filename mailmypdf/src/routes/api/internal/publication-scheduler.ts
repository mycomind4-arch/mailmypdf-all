import { createFileRoute } from "@tanstack/react-router";
import { getConfig } from "@/config";
import { attachRequestId, createRequestLogger, getOrCreateRequestId } from "@/lib/request-id";

export const Route = createFileRoute("/api/internal/publication-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = getOrCreateRequestId(request);
        const log = createRequestLogger(requestId);
        const config = getConfig();
        const authHeader = request.headers.get("authorization");

        if (!config.jobs.cleanupSecret || authHeader !== `Bearer ${config.jobs.cleanupSecret}`) {
          log.warn("unauthorized publication scheduler request");
          return attachRequestId(new Response("Unauthorized", { status: 401 }), requestId);
        }

        try {
          const { runDuePublications } = await import("@/lib/publication-scheduler.server");
          const results = await runDuePublications();
          const response = Response.json({
            ok: true,
            started: results.filter((result) => result.status === "started").length,
            failed: results.filter((result) => result.status === "failed").length,
            skipped: results.filter((result) => result.status === "skipped").length,
            results,
          });
          return attachRequestId(response, requestId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          log.error("publication scheduler failed", { error: message });
          return attachRequestId(Response.json({ ok: false, error: message }, { status: 500 }), requestId);
        }
      },
    },
  },
});
