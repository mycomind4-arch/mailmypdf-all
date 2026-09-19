// POST /api/v1/communications — Create and send a communication.
//
// Physical mailing requests require an idempotency key. A retry with the same
// tenant-scoped key returns the existing communication instead of creating a
// second physical mailing.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthWithRateLimit, errorResponse, parseJsonBody, withRateLimitHeaders } from "@/lib/proof-of-service/api-helpers";
import { getProofDocument } from "@/lib/proof-of-service/documents";
import { createCommunication, getCommunication } from "@/lib/proof-of-service/communications";
import { sendCommunicationViaLob } from "@/lib/proof-of-service/lob-bridge";
import { verifyAndRecord } from "@/lib/proof-of-service/address-verification";
import { getConfig } from "@/config";

const legalReferenceSchema = z.object({
  type: z.enum(["statute", "lease_clause", "contract_term", "regulation", "ordinance", "other"]),
  citation: z.string().min(1).max(500),
  description: z.string().min(1).max(1000),
  response_window_days: z.number().int().min(1).max(365).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

const recipientSchema = z.object({
  name: z.string().min(1).max(120),
  address_line1: z.string().min(1).max(200),
  address_line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  postal_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().length(2).optional().default("US"),
});

const createCommunicationSchema = z.object({
  idempotency_key: z.string().min(8).max(200).optional(),
  document_id: z.string().uuid(),
  legal_reference: legalReferenceSchema,
  recipient: recipientSchema,
  mail_type: z.enum(["first_class", "certified", "certified_return_receipt", "registered"]),
  matter_reference: z.string().min(1).max(200),
  matter_type: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
  from_address: z.object({
    name: z.string().min(1).max(120),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    postal: z.string().regex(/^\d{5}(-\d{4})?$/),
  }).optional(),
});

export const Route = createFileRoute("/api/v1/communications/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAuthWithRateLimit(request, "communications.create");
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const parsed = await parseJsonBody<z.infer<typeof createCommunicationSchema>>(request, (data) => {
          const result = createCommunicationSchema.safeParse(data);
          if (!result.success) {
            const firstError = result.error.issues[0];
            return { error: firstError.message, field: firstError.path.join(".") };
          }
          return result.data;
        });

        if ("error" in parsed) return parsed.error;

        const input = parsed;
        const idempotencyKey = input.idempotency_key ?? request.headers.get("Idempotency-Key") ?? undefined;
        if (!idempotencyKey) {
          return errorResponse(
            400,
            "invalid_request",
            "Idempotency-Key header or idempotency_key body field is required for mailing requests",
            "IDEMPOTENCY_KEY_REQUIRED",
          );
        }

        // A retry must return the existing communication before any address
        // verification, provider call, or other fulfillment side effect.
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("proof_communications")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existingError) {
          return errorResponse(500, "internal_error", "Unable to check request idempotency", "IDEMPOTENCY_CHECK_FAILED");
        }

        if (existing) {
          const existingCommunication = await getCommunication(existing.id, tenant.id, { supabaseAdmin });
          if (!existingCommunication) {
            return errorResponse(409, "conflict", "Idempotency key is already reserved", "IDEMPOTENCY_CONFLICT");
          }
          return withRateLimitHeaders(Response.json(existingCommunication, { status: 200 }), tenant.id, "communications.create");
        }

        const document = await getProofDocument(input.document_id, tenant.id, { supabaseAdmin });
        if (!document) {
          return errorResponse(404, "not_found", "Document not found", "DOCUMENT_NOT_FOUND");
        }

        const config = getConfig();
        const fromAddress = input.from_address ?? {
          name: "Proof-of-Service",
          line1: "1 Mail Service Rd",
          city: "Eureka",
          state: "CA",
          postal: "95501",
        };

        try {
          const comm = await createCommunication(
            {
              tenant_id: tenant.id,
              idempotency_key: idempotencyKey,
              document_id: document.id,
              document_sha256: document.sha256,
              legal_reference: {
                type: input.legal_reference.type,
                citation: input.legal_reference.citation,
                description: input.legal_reference.description,
                response_window_days: input.legal_reference.response_window_days ?? null,
                response_window_ends: null,
                notes: input.legal_reference.notes,
              },
              recipient: {
                name: input.recipient.name,
                address_line1: input.recipient.address_line1,
                address_line2: input.recipient.address_line2 ?? null,
                city: input.recipient.city,
                state: input.recipient.state,
                postal_code: input.recipient.postal_code,
                country: input.recipient.country,
                address_verified: false,
                lob_address_id: null,
              },
              mail_type: input.mail_type,
              matter_reference: input.matter_reference,
              matter_type: input.matter_type,
              metadata: input.metadata,
            },
            { supabaseAdmin },
          );

          const tenantLobKey = await (async () => {
            const { data } = await supabaseAdmin
              .from("proof_tenants")
              .select("lob_api_key")
              .eq("id", tenant.id)
              .maybeSingle();
            return data?.lob_api_key ?? null;
          })();

          const addressVerification = await verifyAndRecord(
            {
              name: input.recipient.name,
              address_line1: input.recipient.address_line1,
              address_line2: input.recipient.address_line2 ?? null,
              city: input.recipient.city,
              state: input.recipient.state,
              postal_code: input.recipient.postal_code,
              country: input.recipient.country,
              address_verified: false,
              lob_address_id: null,
            },
            comm.id,
            tenant.id,
            { supabaseAdmin },
            { tenantLobKey },
          );

          const { error: recipientUpdateError } = await supabaseAdmin
            .from("proof_communications")
            .update({
              recipient: {
                name: input.recipient.name,
                address_line1: input.recipient.address_line1,
                address_line2: input.recipient.address_line2 ?? null,
                city: input.recipient.city,
                state: input.recipient.state,
                postal_code: input.recipient.postal_code,
                country: input.recipient.country,
                address_verified: addressVerification.api_succeeded,
                lob_address_id: null,
              },
            })
            .eq("id", comm.id)
            .eq("tenant_id", tenant.id);

          if (recipientUpdateError) {
            throw new Error(`Failed to update recipient verification: ${recipientUpdateError.message}`);
          }

          if (config.lob.apiKey || tenantLobKey) {
            await sendCommunicationViaLob(
              {
                communication: comm,
                documentStoragePath: document.storage_path,
                fromAddress,
              },
              { supabaseAdmin },
            );
          }

          const updated = await getCommunication(comm.id, tenant.id, { supabaseAdmin });
          return withRateLimitHeaders(Response.json(updated, { status: 201 }), tenant.id, "communications.create");
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          if (message.includes("duplicate key") || message.includes("proof_communications_tenant_idempotency_idx")) {
            const { data: raced } = await supabaseAdmin
              .from("proof_communications")
              .select("id")
              .eq("tenant_id", tenant.id)
              .eq("idempotency_key", idempotencyKey)
              .maybeSingle();
            if (raced) {
              const existingCommunication = await getCommunication(raced.id, tenant.id, { supabaseAdmin });
              return withRateLimitHeaders(Response.json(existingCommunication, { status: 200 }), tenant.id, "communications.create");
            }
          }

          if (message.includes("Lob")) {
            return errorResponse(422, "lob_error", message, "LOB_ERROR");
          }
          return errorResponse(500, "internal_error", message, "INTERNAL_ERROR");
        }
      },
    },
  },
});
