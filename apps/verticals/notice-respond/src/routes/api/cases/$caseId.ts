import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { getRepository } from "@/platform/repository";
import { updateCase, type NoticeCase } from "@/domain/notice";
import type { WorkflowState } from "@/domain/workflow-runtime";

/**
 * GET    /api/cases/$caseId — load a case (owner-scoped)
 * PATCH  /api/cases/$caseId — update a case (owner-scoped)
 *
 * Owner identity comes from requireAuthenticatedUser — never from the request body.
 * Cross-owner access returns 404 (not 403) to avoid leaking case existence.
 */
export const Route = createFileRoute("/api/cases/$caseId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;

          const repo = getRepository();
          const caseObj = await repo.load(caseId, user.id);

          if (!caseObj) {
            // Safe not-found: does not reveal whether the case exists under another owner
            return Response.json({ error: "Case not found." }, { status: 404 });
          }

          return Response.json({ case: caseObj });
        } catch (error) {
          return authErrorResponse(error);
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const caseId = params.caseId as string;

          const repo = getRepository();
          const existing = await repo.load(caseId, user.id);

          if (!existing) {
            return Response.json({ error: "Case not found." }, { status: 404 });
          }

          const body = await request.json() as Partial<NoticeCase> & {
            workflowState?: WorkflowState;
          };

          // Strip any client-provided ownerId — always use the authenticated user
          const { ownerId: _ignored, ...updates } = body;

          const updated = updateCase(existing, {
            ...updates,
            ownerId: user.id, // Enforce: owner is always the authenticated user
          });

          const saved = await repo.save(updated);

          return Response.json({ case: saved });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
