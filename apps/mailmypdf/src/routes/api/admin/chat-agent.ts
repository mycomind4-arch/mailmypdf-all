/**
 * Admin Chat Agent API Route
 *
 * Endpoint for processing admin chat commands via the platform agent
 */

import { createFileRoute } from "@tanstack/react-router";
import { processAdminCommandCore } from "@/lib/admin-chat-agent.server";
import { validateAdminSession } from "@/lib/admin-auth.server";

// @ts-expect-error — TanStack Router route type generation
export const Route = createFileRoute("/api/admin/chat-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Validate admin session
          const sessionToken =
            request.headers.get("Authorization")?.replace("Bearer ", "");
          const isValidSession = await validateAdminSession(sessionToken);

          if (!isValidSession) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();
          const result = await processAdminCommandCore(body);

          return Response.json(result, { status: 200 });
        } catch (error) {
          console.error("Chat agent error:", error);
          return Response.json(
            {
              error: "Failed to process command",
              message:
                error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
