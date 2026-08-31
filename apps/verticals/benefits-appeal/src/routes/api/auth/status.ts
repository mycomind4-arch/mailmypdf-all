import { createFileRoute } from "@tanstack/react-router";
import { getAuthStatus } from "@/lib/auth-guard";

/* Returns auth configuration status — public endpoint */
export const Route = createFileRoute("/api/auth/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const status = await getAuthStatus(request);
        return Response.json(status);
      },
    },
  },
});
