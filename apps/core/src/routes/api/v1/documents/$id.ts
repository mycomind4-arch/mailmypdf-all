// GET /api/v1/documents/$id — Retrieve a document's metadata + hash.

import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getProofDocument } from "@/lib/proof-of-service/documents";

export const Route = createFileRoute("/api/v1/documents/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const document = await getProofDocument(params.id, tenant.id, { supabaseAdmin });

        if (!document) {
          return errorResponse(404, "not_found", "Document not found", "NOT_FOUND");
        }

        return Response.json(document);
      },
    },
  },
});
