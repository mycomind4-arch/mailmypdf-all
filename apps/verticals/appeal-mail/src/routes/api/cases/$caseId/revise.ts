import { createFileRoute } from "@tanstack/react-router";
import { AuthError, requireUser } from "@/lib/auth-guard";
import { reviseOwnedCaseDraft } from "@/platform/case-ai-logic";

export const Route = createFileRoute("/api/cases/$caseId/revise")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await requireUser(request);
          const body = (await request.json()) as { instruction?: string };
          const result = await reviseOwnedCaseDraft({
            caseId: params.caseId,
            ownerId: user.id,
            instruction: body.instruction ?? "",
          });
          return Response.json(result, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          const status = error instanceof AuthError ? error.status : 400;
          return Response.json(
            { error: error instanceof Error ? error.message : "Case revision failed." },
            { status },
          );
        }
      },
    },
  },
});
