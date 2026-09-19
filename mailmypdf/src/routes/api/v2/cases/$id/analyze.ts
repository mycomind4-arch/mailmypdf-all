import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { analyseSubjectNotice, loadLatestAnalysis } from "@/lib/secure-core/case-analysis.server";
import { DocumentNotDisclosableError } from "@/lib/secure-core/ai-gateway.server";
import { errorResponse, json, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/analyze")({
  server: {
    handlers: {
      // Reads the case's notice and records what it says. The gateway refuses a
      // document that has not cleared malware scanning, so this fails closed
      // rather than analysing unscanned content.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          return json(201, { analysis: await analyseSubjectNotice(params.id, context) });
        } catch (error) {
          if (error instanceof DocumentNotDisclosableError) {
            return json(409, { error: error.message });
          }
          return errorResponse("case-analyze", error);
        }
      },

      GET: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          return json(200, { analysis: await loadLatestAnalysis(params.id, context) });
        } catch (error) {
          return errorResponse("case-analysis-read", error);
        }
      },
    },
  },
});
