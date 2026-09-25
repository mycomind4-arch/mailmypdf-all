import { createFileRoute } from "@tanstack/react-router";
import { getSiteOrigin } from "@/lib/site-url";
import { MCP_SCOPES } from "@/lib/mcp/tool-catalog";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = getSiteOrigin() ?? new URL(request.url).origin;
        const authorizationServer = process.env.MCP_AUTHORIZATION_SERVER?.trim();

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
            scopes_supported: Object.values(MCP_SCOPES),
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
