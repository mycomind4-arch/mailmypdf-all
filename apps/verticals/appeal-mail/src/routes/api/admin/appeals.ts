import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/auth-guard";
import { getSupabaseServer } from "@/platform/supabase";

/* ═══════════════════════════════════════════════════════════
   Admin API — list appeals (admin can view all, not just own)
   ═══════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/api/admin/appeals")({
  server: {
    handlers: {
        GET: async ({ request }) => {
    try {
      await requireAdmin(request);

      const supabase = await getSupabaseServer();
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const status = url.searchParams.get("status");

      let query = supabase
        .from("appeals")
        .select("id, user_id, workflow_id, status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500 });

      return Response.json({ appeals: data || [], count: data?.length || 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access denied.";
      const status = (error as { status?: number }).status || 500;
      return Response.json({ error: message }, { status });
    }
      },
    },
  },
});