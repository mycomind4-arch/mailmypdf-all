import { createFileRoute } from "@tanstack/react-router";
import { handleMailMyPdfMcpRequest } from "@/lib/mcp/mcp-handler.server";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: ({ request }) => handleMailMyPdfMcpRequest(request),
      POST: ({ request }) => handleMailMyPdfMcpRequest(request),
    },
  },
});
