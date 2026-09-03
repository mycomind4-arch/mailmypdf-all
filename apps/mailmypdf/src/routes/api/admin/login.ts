/**
 * Admin Login API Endpoint
 */

import { createFileRoute } from "@tanstack/react-router";
import { adminLogin } from "@/lib/admin-auth.server";

// @ts-expect-error — TanStack Router route type generation
export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const result = await adminLogin(body);

          return Response.json(result, { status: 200 });
        } catch (error) {
          console.error("Login error:", error);
          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Login failed",
            },
            { status: 401 }
          );
        }
      },
    },
  },
});
