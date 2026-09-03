/**
 * Admin Chat Agent API Route
 *
 * Endpoint for processing admin chat commands via the platform agent
 */

import { createAPIFileRoute } from "@tanstack/start";
import { processAdminCommand } from "@/lib/admin-chat-agent.server";
import { validateAdminSession } from "@/lib/admin-auth.server";

export const APIRoute = createAPIFileRoute("/api/admin/chat-agent")(
  async (event) => {
    // Validate admin session
    const sessionToken =
      event.request.headers.get("Authorization")?.replace("Bearer ", "");
    const isValidSession = await validateAdminSession(sessionToken);

    if (!isValidSession) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (event.request.method === "POST") {
      try {
        const body = await event.request.json();
        const result = await processAdminCommand(body);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Chat agent error:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to process command",
            message:
              error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Method not allowed", { status: 405 });
  }
);
