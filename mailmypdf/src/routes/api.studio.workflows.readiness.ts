import { createFileRoute } from "@tanstack/react-router";
import { canonicalChatFactoryReport } from "@mailmypdf/workflows";
import { studioAccessError } from "@/studio/access";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";

/** Admin-only, read-only queue for the supervised workflow factory. */
export const Route = createFileRoute("/api/studio/workflows/readiness")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;

        const workflows = canonicalChatFactoryReport(MAILMYPDF_MCP_TOOLS.map((tool) => tool.name));
        return Response.json({
          total: workflows.length,
          chatExecutable: workflows.filter((workflow) => workflow.chatExecutable).length,
          awaitingChatContract: workflows.filter((workflow) => workflow.reason === "chat-contract-not-registered").length,
          workflows,
        }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
