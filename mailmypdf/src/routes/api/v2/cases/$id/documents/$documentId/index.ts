import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  CaseError,
  detachDocument,
  listCaseDocuments,
  reorderDocument,
  setDocumentIncluded,
} from "@/lib/secure-core/case.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/documents/$documentId/")({
  server: {
    handlers: {
      // Curating the packet: include, exclude, or reorder an attachment.
      PATCH: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id) || !UUID_PATTERN.test(params.documentId)) {
            return json(400, { error: "Invalid identifier" });
          }
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);
          const target = { caseId: params.id, documentId: params.documentId };

          let changed = false;
          if (typeof body.included === "boolean") {
            await setDocumentIncluded({ ...target, included: body.included }, context);
            changed = true;
          }
          if (body.position !== undefined) {
            await reorderDocument({ ...target, position: Number(body.position) }, context);
            changed = true;
          }
          if (!changed) throw new CaseError("Provide included or position");

          return json(200, { documents: await listCaseDocuments(params.id, context) });
        } catch (error) {
          return errorResponse("case-curate", error);
        }
      },

      // Removes the attachment from the case. The file itself keeps its own
      // retention clock; deleting it is a separate request against the vault.
      DELETE: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id) || !UUID_PATTERN.test(params.documentId)) {
            return json(400, { error: "Invalid identifier" });
          }
          const context = await requireAuthenticatedUser(request);
          await detachDocument({ caseId: params.id, documentId: params.documentId }, context);
          return json(200, { documents: await listCaseDocuments(params.id, context) });
        } catch (error) {
          return errorResponse("case-detach", error);
        }
      },
    },
  },
});
