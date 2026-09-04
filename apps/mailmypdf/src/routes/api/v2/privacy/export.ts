import { createFileRoute } from "@tanstack/react-router";
import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/secure-core/auth.server";

const EXPORT_LIMIT = 1_001;
const noStore = { "Cache-Control": "no-store", Pragma: "no-cache" };

export const Route = createFileRoute("/api/v2/privacy/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireAuthenticatedUser(request);
          const [documentsResult, consentsResult, eventsResult] = await Promise.all([
            context.supabase
              .from("secure_documents")
              .select("id, workflow_id, original_filename, safe_filename, mime_type, size_bytes, sha256, security_status, retention_until, deletion_requested_at, deleted_at, created_at")
              .eq("owner_id", context.user.id)
              .order("created_at", { ascending: true })
              .limit(EXPORT_LIMIT),
            context.supabase
              .from("document_consents")
              .select("id, workflow_id, purpose, consent_version, consented_at")
              .eq("owner_id", context.user.id)
              .order("consented_at", { ascending: true })
              .limit(EXPORT_LIMIT),
            context.supabase
              .from("security_events")
              .select("id, document_id, event_type, metadata, created_at")
              .eq("owner_id", context.user.id)
              .order("created_at", { ascending: true })
              .limit(EXPORT_LIMIT),
          ]);
          if (documentsResult.error || consentsResult.error || eventsResult.error) {
            throw new Error("Unable to read secure account records");
          }

          const collections = {
            documents: documentsResult.data ?? [],
            consents: consentsResult.data ?? [],
            security_events: eventsResult.data ?? [],
          };
          const truncated = Object.values(collections).some((rows) => rows.length === EXPORT_LIMIT);
          if (truncated) {
            return Response.json({
              error: "Export exceeds the synchronous safety limit",
              code: "ASYNC_EXPORT_REQUIRED",
            }, { status: 413, headers: noStore });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;
          const { error: auditError } = await admin.from("security_events").insert({
            owner_id: context.user.id,
            document_id: null,
            event_type: "account.secure_data_exported",
            metadata: {
              documents: collections.documents.length,
              consents: collections.consents.length,
              security_events: collections.security_events.length,
            },
          });
          if (auditError) throw new Error("Unable to audit account export");

          return Response.json({
            schema_version: "secure-core-export-v1",
            exported_at: new Date().toISOString(),
            user_id: context.user.id,
            ...collections,
          }, { headers: { ...noStore, "Content-Disposition": "attachment; filename=mailmypdf-secure-data.json" } });
        } catch (error) {
          if (error instanceof AuthenticationError) {
            return Response.json({ error: error.message }, { status: 401, headers: noStore });
          }
          console.error("[secure-data-export] request failed", error);
          return Response.json({ error: "Secure data export failed" }, { status: 500, headers: noStore });
        }
      },
    },
  },
});
