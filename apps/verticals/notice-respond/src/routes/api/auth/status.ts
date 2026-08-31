import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";

export const Route = createFileRoute("/api/auth/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const configured = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
        if (!configured) return Response.json({ configured: false, authenticated: false, user: null });
        const authorization = request.headers.get("authorization") || request.headers.get("Authorization");
        if (!authorization) return Response.json({ configured: true, authenticated: false, user: null });
        try {
          const user = await requireAuthenticatedUser(request);
          return Response.json({ configured: true, authenticated: true, user: { id: user.id, email: user.email ?? null } });
        } catch (error) {
          return authErrorResponse(error);
        }
      },
    },
  },
});
