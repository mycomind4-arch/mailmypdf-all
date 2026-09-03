/**
 * Admin Login API Endpoint
 */

import { createAPIFileRoute } from "@tanstack/start";
import { adminLogin } from "@/lib/admin-auth.server";

export const APIRoute = createAPIFileRoute("/api/admin/login")(
  async (event) => {
    if (event.request.method === "POST") {
      try {
        const body = await event.request.json();
        const result = await adminLogin(body);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Login error:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Login failed",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Method not allowed", { status: 405 });
  }
);
