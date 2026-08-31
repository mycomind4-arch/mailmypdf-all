import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { getRepository } from "@/platform/repository";
import { createCase, updateCase, type NoticeCase } from "@/domain/notice";
import type { WorkflowState } from "@/domain/workflow-runtime";

/**
 * POST /api/cases
 *
 * Creates a new case owned by the authenticated user.
 * The owner ID comes from the trusted auth token — never from the request body.
 *
 * Request body: { workflowId: string, workflowState?: WorkflowState }
 * Response: { case: NoticeCase }
 */
export const Route = createFileRoute("/api/cases/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const body = await request.json() as { workflowId?: string; workflowState?: WorkflowState };

          const workflowId = body.workflowId || "analyze";
          const caseObj = createCase(workflowId);
          const owned: NoticeCase = updateCase(caseObj, {
            ownerId: user.id,
            workflowState: body.workflowState ?? undefined,
          });

          const repo = getRepository();
          const saved = await repo.save(owned);

          return Response.json({ case: saved }, { status: 201 });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
