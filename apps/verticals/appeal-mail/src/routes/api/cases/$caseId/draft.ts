import { createFileRoute } from "@tanstack/react-router";
import { AuthError, requireUser } from "@/lib/auth-guard";
import { runOwnedCaseDraft } from "@/platform/case-ai-logic";

export const Route = createFileRoute("/api/cases/$caseId/draft")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await requireUser(request);
          const body = (await request.json()) as {
            userFacts?: string;
            userObjective?: string;
          };
          const result = await runOwnedCaseDraft({
            caseId: params.caseId,
            ownerId: user.id,
            userFacts: body.userFacts ?? "",
            userObjective: body.userObjective ?? "",
          });
          return Response.json(result, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const status = error instanceof AuthError ? error.status : 400;
          return Response.json(
            { error: error instanceof Error ? error.message : "Case drafting failed." },
            { status },
          );
        }
      },
    },
  },
});
