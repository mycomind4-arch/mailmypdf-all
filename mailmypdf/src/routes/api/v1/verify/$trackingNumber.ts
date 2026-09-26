// GET /api/v1/verify/:trackingNumber — Public verification endpoint (no auth).
//
// A third party (judge, auditor, opposing counsel) can verify a proof bundle
// without trusting the sender. Query by tracking number + document hash.
//
// Returns only the facts of the send and delivery — no tenant data, no
// recipient PII, no legal strategy. Just: was this sent? was it delivered?
// what was the custody chain?
//
// Query params: document_hash (required) — SHA-256 of the document

import { createFileRoute } from "@tanstack/react-router";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { checkPublicRateLimit } from "@/lib/proof-of-service/rate-limiting";

export const Route = createFileRoute("/api/v1/verify/$trackingNumber")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Public rate limit (by IP, no tenant auth) — distributed across isolates
        const rateLimited = await checkPublicRateLimit(request, "verify");
        if (rateLimited) return rateLimited;

        const url = new URL(request.url);
        const documentHash = url.searchParams.get("document_hash");

        if (!documentHash) {
          return errorResponse(400, "validation_error", "document_hash query parameter is required", "MISSING_PARAM");
        }

        // Dynamic import to avoid loading supabase at module level
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find the communication by tracking number + document hash
        const { data: comm, error } = await supabaseAdmin
          .from("proof_communications")
          .select(`
            id,
            status,
            sent_at,
            delivered_at,
            tracking_number,
            mail_type,
            carrier,
            document_sha256,
            legal_reference,
            proof_custody_events (
              timestamp,
              event_type,
              description,
              event_hash,
              prior_event_hash
            )
          `)
          .eq("tracking_number", params.trackingNumber)
          .eq("document_sha256", documentHash)
          .maybeSingle();

        if (!error && comm) {
          // Return ONLY verification-relevant data — no PII, no tenant ID.
          return Response.json({
            verified: true,
            record_type: "proof_communication",
            tracking_number: comm.tracking_number,
            carrier: comm.carrier,
            mail_type: comm.mail_type,
            status: comm.status,
            sent_at: comm.sent_at,
            delivered_at: comm.delivered_at,
            document_sha256: comm.document_sha256,
            // Include legal reference citation only (not notes/strategy)
            legal_citation: (comm.legal_reference as Record<string, unknown>)?.citation ?? null,
            legal_description: (comm.legal_reference as Record<string, unknown>)?.description ?? null,
            response_window_ends: (comm.legal_reference as Record<string, unknown>)?.response_window_ends ?? null,
            // Custody chain (hash-linked, verifiable)
            custody_chain: comm.proof_custody_events,
          });
        }

        // Ordinary MailMyPDF orders now retain the same document fingerprint
        // and carrier identifiers. Allow third parties to verify those facts
        // too, but never expose customer email or sender/recipient PII.
        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .select(`
            status,
            mail_class,
            lob_letter_id,
            tracking_number,
            document_sha256,
            mailed_at,
            delivered_at,
            order_events (
              type,
              created_at,
              metadata
            )
          `)
          .eq("tracking_number", params.trackingNumber)
          .eq("document_sha256", documentHash)
          .maybeSingle();

        if (orderError || !order) {
          return Response.json(
            { verified: false, message: "No matching mailing evidence record found" },
            { status: 404 },
          );
        }

        const eventHistory = (order.order_events ?? []).map((event: {
          type: string;
          created_at: string;
          metadata: unknown;
        }) => {
          const metadata =
            event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
              ? event.metadata as Record<string, unknown>
              : {};
          return {
            event: event.type,
            recorded_at: event.created_at,
            provider_event_id:
              typeof metadata.external_id === "string" ? metadata.external_id : null,
            lifecycle_status:
              typeof metadata.lifecycle_status === "string" ? metadata.lifecycle_status : null,
          };
        });

        return Response.json({
          verified: true,
          record_type: "mailmypdf_order",
          tracking_number: order.tracking_number,
          carrier: "USPS",
          provider: "Lob",
          provider_reference: order.lob_letter_id,
          mail_type: order.mail_class,
          status: order.status,
          mailed_at: order.mailed_at,
          delivered_at: order.delivered_at,
          document_sha256: order.document_sha256,
          event_history: eventHistory,
        });
      },
    },
  },
});
