// GET /api/v1/communications — List communications (with filtering)
// Query params: matter_reference, status, limit (max 500), offset

import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, errorResponse } from "@/lib/proof-of-service/api-helpers";
import { listCommunications } from "@/lib/proof-of-service/communications";

export const Route = createFileRoute("/api/v1/communications/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const url = new URL(request.url);
        const filters = {
          matter_reference: url.searchParams.get("matter_reference") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
          limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
          offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
        };

        const result = await listCommunications(tenant.id, { supabaseAdmin }, filters);

        return Response.json({
          data: result.records,
          has_more: result.has_more,
        });
      },
    },
  },
});
