import { createFileRoute } from "@tanstack/react-router";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/secure-core/auth.server";

const noStore = { "Cache-Control": "no-store", Pragma: "no-cache" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/v2/documents/$id/")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          if (!UUID.test(params.id)) {
            return Response.json({ error: "Invalid document ID" }, { status: 400, headers: noStore });
          }
          const context = await requireAuthenticatedUser(request);
          const { data, error } = await context.supabase.rpc("request_secure_document_deletion", {
            document_id: params.id,
          });
          if (error) throw new Error("Unable to request document deletion");
          if (data !== true) {
            return Response.json({ error: "Document not found" }, { status: 404, headers: noStore });
          }
          return Response.json({ id: params.id, status: "deleting" }, { status: 202, headers: noStore });
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return Response.json({ error: error.message }, { status: 401, headers: noStore });
          }
          console.error("[secure-document-delete] request failed", error);
          return Response.json({ error: "Document deletion request failed" }, {
            status: 500,
            headers: noStore,
          });
        }
      },
    },
  },
});
