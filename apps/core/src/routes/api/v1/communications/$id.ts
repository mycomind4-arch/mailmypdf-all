// GET /api/v1/communications/$id — Retrieve a full communication record (including custody chain)

import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getCommunication } from "@/lib/proof-of-service/communications";

export const Route = createFileRoute("/api/v1/communications/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const comm = await getCommunication(params.id, tenant.id, { supabaseAdmin });

        if (!comm) {
          return errorResponse(404, "not_found", "Communication not found", "NOT_FOUND");
        }

        return Response.json(comm);
      },
    },
  },
});
