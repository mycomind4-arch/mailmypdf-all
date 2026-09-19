// GET /api/v1/communications/$id/proof — Generate/retrieve the proof bundle.
//
// The proof bundle is the exportable evidence package:
// document hash, send proof, delivery proof, legal context, response window
// status, and the full hash-linked custody chain. This is what gets handed
// to a judge or attached to a filing.

import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, errorResponse } from "@/lib/proof-of-service/api-helpers";
import { generateProofBundle } from "@/lib/proof-of-service/proof-bundle";

export const Route = createFileRoute("/api/v1/communications/$id/proof")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const bundle = await generateProofBundle(params.id, tenant.id, { supabaseAdmin });

        if (!bundle) {
          return errorResponse(404, "not_found", "Communication not found", "NOT_FOUND");
        }

        return Response.json(bundle);
      },
    },
  },
});
