import { createFileRoute } from "@tanstack/react-router";
import { AuthError, requireUser } from "@/lib/auth-guard";
import { runOwnedCaseAnalysis } from "@/platform/case-ai-logic";

export const Route = createFileRoute("/api/cases/$caseId/analyze")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await requireUser(request);
          const body = (await request.json()) as { documentText?: string };
          const result = await runOwnedCaseAnalysis({
            caseId: params.caseId,
            ownerId: user.id,
            documentText: body.documentText ?? "",
          });
          return Response.json(result, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const status = error instanceof AuthError ? error.status : 400;
          return Response.json(
            { error: error instanceof Error ? error.message : "Case analysis failed." },
            { status },
          );
        }
      },
    },
  },
});
