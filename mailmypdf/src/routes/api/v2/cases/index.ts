import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { createCase, CaseError } from "@/lib/secure-core/case.server";
import { errorResponse, json, readJson } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);
          const workflowId = String(body.workflow_id ?? "").trim();
          const verticalId = String(body.vertical_id ?? "").trim();
          if (!workflowId || !verticalId) throw new CaseError("workflow_id and vertical_id are required");

          const workflowCase = await createCase({ workflowId, verticalId }, context);
          return json(201, { case: workflowCase });
        } catch (error) {
          return errorResponse("case-create", error);
        }
      },
    },
  },
});
