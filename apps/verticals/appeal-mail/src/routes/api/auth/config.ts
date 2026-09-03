import { createFileRoute } from "@tanstack/react-router";

// Expose only the public Supabase client configuration to the browser.
export const Route = createFileRoute("/api/auth/config")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const anonKey =
          process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!url || !anonKey) {
          return Response.json({ configured: false, url: null, anonKey: null });
        }

        return Response.json({ configured: true, url, anonKey });
      },
    },
  },
});
