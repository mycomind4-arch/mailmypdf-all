import { createFileRoute } from "@tanstack/react-router";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/secure-core/auth.server";

const BUCKET = "secure-documents";
const DOWNLOAD_TTL_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/v2/documents/$id/download")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!UUID.test(params.id)) {
            return Response.json({ error: "Invalid document ID" }, { status: 400 });
          }
          const context = await requireAuthenticatedUser(request);
          const { data: owned } = await context.supabase
            .from("secure_documents")
            .select("id")
            .eq("id", params.id)
            .eq("owner_id", context.user.id)
            .eq("security_status", "clean")
            .is("deleted_at", null)
            .maybeSingle();
          if (!owned) return Response.json({ error: "Document not found" }, { status: 404 });

          // Recheck every authorization condition with the privileged client.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin;
          const { data: document } = await admin
            .from("secure_documents")
            .select("storage_path")
            .eq("id", owned.id)
            .eq("owner_id", context.user.id)
            .eq("security_status", "clean")
            .is("deleted_at", null)
            .maybeSingle();
          if (!document) return Response.json({ error: "Document not found" }, { status: 404 });

          const { data, error } = await admin.storage
            .from(BUCKET)
            .createSignedUrl(document.storage_path, DOWNLOAD_TTL_SECONDS);
          if (error || !data?.signedUrl) throw new Error("Unable to create download grant");

          const { error: auditError } = await admin.from("security_events").insert({
            owner_id: context.user.id,
            document_id: owned.id,
            event_type: "document.download_grant_created",
            metadata: { expires_in_seconds: DOWNLOAD_TTL_SECONDS },
          });
          if (auditError) throw new Error("Unable to audit download grant");

          return Response.json({ url: data.signedUrl, expires_in: DOWNLOAD_TTL_SECONDS }, {
            headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
          });
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return Response.json({ error: error.message }, { status: 401 });
          }
          console.error("[secure-document-download] request failed", error);
          return Response.json({ error: "Document download failed" }, { status: 500 });
        }
      },
    },
  },
});
