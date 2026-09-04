import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { listCaseDocuments, loadCase } from "@/lib/secure-core/case.server";
import { errorResponse, json, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const [workflowCase, documents] = await Promise.all([
            loadCase(params.id, context),
            listCaseDocuments(params.id, context),
          ]);
          return json(200, { case: workflowCase, documents });
        } catch (error) {
          return errorResponse("case-read", error);
        }
      },
    },
  },
});
