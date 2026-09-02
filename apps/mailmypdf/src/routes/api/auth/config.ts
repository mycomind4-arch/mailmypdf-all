import { createFileRoute } from "@tanstack/react-router";

/* Returns public Supabase config at runtime — safe to expose (anon/publishable key is public, protected by RLS) */
export const Route = createFileRoute("/api/auth/config")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !anonKey) return Response.json({ configured: false, url: null, anonKey: null });
        return Response.json({ configured: true, url, anonKey });
      },
    },
  },
});
