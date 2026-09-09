import { createFileRoute } from "@tanstack/react-router";
import { AuthError, requireUser } from "@/lib/auth-guard";
import { loadOwnedCase } from "@/platform/case-ai-logic";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Case request failed.";
  const status = /not found|failed to load/i.test(message) ? 404 : 400;
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/cases/$caseId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const user = await requireUser(request);
          const appeal = await loadOwnedCase(params.caseId, user.id);
          return Response.json({ appeal }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
