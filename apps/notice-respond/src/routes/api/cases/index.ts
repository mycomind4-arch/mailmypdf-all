import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { createClient } from "@supabase/supabase-js";

function getServerClient(accessToken: string) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("MailMyPDF Account authentication is not configured.");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function requestToken(request: Request): string {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  return header.slice("Bearer ".length).trim();
}

export const Route = createFileRoute("/api/cases/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          const token = requestToken(request);
          const supabase = getServerClient(token);
          const { data, error } = await supabase.from("cases").select("id, workflow_id, status, notice_type, agency, reference_number, notice_date, readiness_score, health_status, deadline_date, has_draft, has_mailing, created_at, updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ cases: data ?? [] });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
