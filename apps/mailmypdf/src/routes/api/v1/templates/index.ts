// POST /api/v1/templates — Create a notice template.
// GET  /api/v1/templates — List templates (filter by vertical).
//
// Templates are reusable notice templates per vertical. The caller fills in
// variables; the render endpoint generates a PDF and hashes it.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuth, errorResponse, parseJsonBody } from "@/lib/proof-of-service/api-helpers";
import { randomUUID } from "node:crypto";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  vertical: z.string().min(1).max(100).optional().default("custom"),
  body_html: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  default_legal_reference: z.object({
    type: z.enum(["statute", "lease_clause", "contract_term", "regulation", "ordinance", "other"]),
    citation: z.string().min(1).max(500),
    description: z.string().min(1).max(1000),
    response_window_days: z.number().int().min(1).max(365).nullable().optional(),
    notes: z.string().max(2000).optional(),
  }).optional(),
});

export const Route = createFileRoute("/api/v1/templates/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const url = new URL(request.url);
        const vertical = url.searchParams.get("vertical");

        let query = supabaseAdmin
          .from("proof_templates")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false });

        if (vertical) {
          query = query.eq("vertical", vertical);
        }

        const { data, error } = await query;

        if (error) {
          return errorResponse(500, "internal_error", error.message, "INTERNAL_ERROR");
        }

        return Response.json({ data: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        const parsed = await parseJsonBody(request, (data) => {
          const result = createTemplateSchema.safeParse(data);
          if (!result.success) {
            const firstError = result.error.issues[0];
            return { error: firstError.message, field: firstError.path.join(".") };
          }
          return result.data;
        });

        if ("error" in parsed) return parsed.error;

        const templateId = randomUUID();

        const { data, error } = await supabaseAdmin
          .from("proof_templates")
          .insert({
            id: templateId,
            tenant_id: tenant.id,
            name: parsed.name,
            description: parsed.description,
            vertical: parsed.vertical,
            body_html: parsed.body_html,
            variables: parsed.variables,
            default_legal_reference: parsed.default_legal_reference ?? null,
          })
          .select()
          .single();

        if (error) {
          return errorResponse(500, "internal_error", error.message, "INTERNAL_ERROR");
        }

        return Response.json(data, { status: 201 });
      },
    },
  },
});
