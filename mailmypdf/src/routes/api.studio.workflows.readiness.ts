import { createFileRoute } from "@tanstack/react-router";
import { canonicalChatFactoryReport, buildFactoryGraduationReport } from "@mailmypdf/workflows";
import { adminFactoryAccessError } from "@/studio/access";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";

/** Admin-only, read-only queue for the supervised workflow factory. */
export const Route = createFileRoute("/api/studio/workflows/readiness")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const accessError = await adminFactoryAccessError(request);
        if (accessError) return accessError;

        const toolNames = MAILMYPDF_MCP_TOOLS.map((tool) => tool.name);
        const workflows = canonicalChatFactoryReport(toolNames);
        const graduation = buildFactoryGraduationReport(toolNames);
        return Response.json({
          total: workflows.length,
          chatExecutable: workflows.filter((workflow) => workflow.chatExecutable).length,
          awaitingChatContract: workflows.filter((workflow) => workflow.reason === "chat-contract-not-registered").length,
          workflows,
          graduation,
        }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
