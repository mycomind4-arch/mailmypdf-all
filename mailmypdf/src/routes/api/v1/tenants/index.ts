// POST /api/v1/tenants — Create a new tenant and get an API key.
// This is the onboarding endpoint. Returns the API key ONCE — it's never shown again.
//
// Body: { name: string, webhook_url?: string, webhook_secret?: string, lob_api_key?: string }

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse, parseJsonBody, getSupabaseAdmin } from "@/lib/proof-of-service/api-helpers";
import { createTenant } from "@/lib/proof-of-service/auth";

const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  webhook_url: z.string().url().optional(),
  webhook_secret: z.string().min(16).optional(),
  lob_api_key: z.string().optional(),
});

export const Route = createFileRoute("/api/v1/tenants/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // NOTE: This endpoint should be protected by an admin/platform key
        // or restricted to dashboard-only access in production.
        // For now, it requires a valid Bearer token from the config.
        const authHeader = request.headers.get("Authorization");
        const config = (await import("@/config")).getConfig();

        // Simple platform-level auth — requires the platform's own secret
        // In production, this would use a separate platform admin key
        const platformKey = process.env.PROOF_OF_SERVICE_PLATFORM_KEY;
        if (!platformKey) {
          return errorResponse(503, "not_configured", "Tenant onboarding not configured", "NOT_CONFIGURED");
        }

        const providedKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (providedKey !== platformKey) {
          return errorResponse(403, "forbidden", "Platform key required for tenant creation", "FORBIDDEN");
        }

        const parsed = await parseJsonBody<z.infer<typeof createTenantSchema>>(request, (data) => {
          const result = createTenantSchema.safeParse(data);
          if (!result.success) {
            const firstError = result.error.issues[0];
            return { error: firstError.message, field: firstError.path.join(".") };
          }
          return result.data;
        });

        if ("error" in parsed) return parsed.error;

        const supabaseAdmin = await getSupabaseAdmin();

        const result = await createTenant(
          parsed.name,
          { supabaseAdmin },
          {
            webhook_url: parsed.webhook_url,
            webhook_secret: parsed.webhook_secret,
            lob_api_key: parsed.lob_api_key,
          },
        );

        return Response.json(
          {
            tenant_id: result.tenant_id,
            api_key: result.api_key, // shown ONCE
            message: "Store this API key securely. It will not be shown again.",
          },
          { status: 201 },
        );
      },
    },
  },
});
