/**
 * Admin Login API Endpoint
 */

import { createFileRoute } from "@tanstack/react-router";

// @ts-expect-error — TanStack Router route type generation
export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return Response.json({ error: "Use Supabase authentication at /auth." }, { status: 410 });
      },
    },
  },
});
