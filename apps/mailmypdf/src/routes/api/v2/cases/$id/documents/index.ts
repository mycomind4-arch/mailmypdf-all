import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import {
  attachDocument,
  CaseError,
  listCaseDocuments,
  type DocumentRole,
  type EvidenceKind,
} from "@/lib/secure-core/case.server";
import { errorResponse, json, readJson, UUID_PATTERN } from "@/lib/secure-core/http.server";

export const Route = createFileRoute("/api/v2/cases/$id/documents/")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          if (!UUID_PATTERN.test(params.id)) return json(400, { error: "Invalid case ID" });
          const context = await requireAuthenticatedUser(request);
          const body = await readJson(request);

          const documentId = String(body.document_id ?? "");
          if (!UUID_PATTERN.test(documentId)) throw new CaseError("A valid document_id is required");

          const role = body.role;
          if (role !== "subject_notice" && role !== "evidence") {
            throw new CaseError("role must be subject_notice or evidence");
          }

          await attachDocument({
            caseId: params.id,
            documentId,
            role: role as DocumentRole,
            evidenceKind: (body.evidence_kind ?? null) as EvidenceKind | null,
            position: Number.isInteger(body.position) ? (body.position as number) : 0,
          }, context);

          return json(201, { documents: await listCaseDocuments(params.id, context) });
        } catch (error) {
          return errorResponse("case-attach", error);
        }
      },
    },
  },
});
