import { createFileRoute } from "@tanstack/react-router";
import { getSiteOrigin } from "@/lib/site-url";
import { MCP_OAUTH_SCOPES } from "@/lib/mcp/tool-catalog";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = getSiteOrigin() ?? new URL(request.url).origin;
        const explicitAuthorizationServer = process.env.MCP_AUTHORIZATION_SERVER?.trim();
        const supabaseUrl = process.env.SUPABASE_URL?.trim();
        const authorizationServer =
          explicitAuthorizationServer ||
          (supabaseUrl ? new URL("/auth/v1", supabaseUrl.endsWith("/") ? supabaseUrl : `${supabaseUrl}/`).toString().replace(/\/$/, "") : null);

        if (!authorizationServer) {
          return Response.json(
            {
              error: "MCP OAuth is not configured for this deployment.",
              resource: new URL("/api/mcp", origin).toString(),
            },
            {
              status: 503,
              headers: { "access-control-allow-origin": "*" },
            },
          );
        }

        return Response.json(
          {
            resource: new URL("/api/mcp", origin).toString(),
            authorization_servers: [authorizationServer],
            scopes_supported: [...MCP_OAUTH_SCOPES],
            resource_documentation: new URL("/security", origin).toString(),
          },
          {
            headers: {
              "cache-control": "public, max-age=300",
              "access-control-allow-origin": "*",
            },
          },
        );
      },
    },
  },
});
