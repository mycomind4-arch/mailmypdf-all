import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { UUID_PATTERN, errorResponse, json, readJson } from "@/lib/secure-core/http.server";
import { loadLatestCaseDraft, saveCaseDraft } from "@/lib/secure-core/case-draft.server";
import { CaseError } from "@/lib/secure-core/case.server";

export const Route = createFileRoute("/api/v2/cases/$id/draft")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const draft = await loadLatestCaseDraft(params.id, context);

          return json(200, {
            draft: draft
              ? { version: draft.version, bodyText: draft.bodyText, createdAt: draft.createdAt }
              : null,
          });
        } catch (error) {
          return errorResponse("case-draft-read", error);
        }
      },

      // Saves a new immutable draft version. Editing history is preserved so an
      // approval can be traced back to the exact text that was approved.
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);

          const body = await readJson(request);
          const text = typeof body.body_text === "string" ? body.body_text : "";
          if (!text.trim()) throw new CaseError("A draft response is required");

          const { version } = await saveCaseDraft(params.id, { bodyText: text }, context);
          return json(201, { version });
        } catch (error) {
          return errorResponse("case-draft", error);
        }
      },
    },
  },
});
