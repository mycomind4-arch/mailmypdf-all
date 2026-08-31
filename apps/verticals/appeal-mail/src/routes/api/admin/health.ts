import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-guard";
import { getSupabaseServer } from "@/platform/supabase";
import { workflows } from "@/domain/workflows";

/* ═══════════════════════════════════════════════════════════
   Admin API — system health, workflow health, operational data.
   Every endpoint requires admin authorization server-side.
   ═══════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/api/admin/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);

          const workflowCount = Object.keys(workflows).length;
          const configured = isAuthConfigured();

          return Response.json({
            ok: true,
            admin: { id: admin.id, email: admin.email, role: admin.role },
            system: {
              auth_configured: configured,
              workflows_registered: workflowCount,
              supabase_url_set: Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
              service_role_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
              stripe_configured: Boolean(process.env.STRIPE_SECRET_KEY),
              control_plane_configured: Boolean(process.env.MAILMYPDF_CONTROL_PLANE_TOKEN),
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Access denied.";
          const status = (error as { status?: number }).status || 500;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
