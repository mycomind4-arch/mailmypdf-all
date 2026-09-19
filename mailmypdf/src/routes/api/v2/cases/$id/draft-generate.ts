import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { generateDraftResponse } from "@/lib/secure-core/case-analysis.server";
import { errorResponse, json, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/draft-generate")({
  server: {
    handlers: {
      // Produces draft text from the stored analysis. Deliberately does not save
      // it: a draft version is created only when a person saves one, so the
      // immutable draft chain records what was accepted rather than everything
      // a model produced. The notice is not re-disclosed here.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const draft = await generateDraftResponse(params.id, context);
          return json(200, {
            body_text: draft.bodyText,
            model: draft.model,
            based_on_analysis_version: draft.basedOnAnalysisVersion,
          });
        } catch (error) {
          return errorResponse("case-draft-generate", error);
        }
      },
    },
  },
});
