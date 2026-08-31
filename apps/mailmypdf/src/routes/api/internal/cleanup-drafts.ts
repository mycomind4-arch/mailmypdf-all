import { createFileRoute } from "@tanstack/react-router";
import {
  cleanupExpiredDrafts,
  requireCleanupAuthorization,
} from "@/lib/draft-cleanup.server";
import { getOrCreateRequestId, attachRequestId, createRequestLogger } from "@/lib/request-id";

async function handleCleanup(request: Request): Promise<Response> {
  const requestId = getOrCreateRequestId(request);
  const log = createRequestLogger(requestId);

  try {
    requireCleanupAuthorization(request);
    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    log.info("draft cleanup starting", { dryRun });
    const result = await cleanupExpiredDrafts({ dryRun });
    const status = result.failed.length > 0 ? 500 : 200;
    const resp = Response.json(result, { status });
    return attachRequestId(resp, requestId);
  } catch (error) {
    if (error instanceof Response) {
      attachRequestId(error, requestId);
      return error;
    }
    log.error("draft cleanup failed", { error: error instanceof Error ? error.message : String(error) });
    const resp = Response.json(
      { error: error instanceof Error ? error.message : "Draft cleanup failed" },
      { status: 500 },
    );
    return attachRequestId(resp, requestId);
  }
}

export const Route = createFileRoute("/api/internal/cleanup-drafts")({
  server: {
    handlers: {
      GET: async ({ request }) => handleCleanup(request),
      POST: async ({ request }) => handleCleanup(request),
    },
  },
});
