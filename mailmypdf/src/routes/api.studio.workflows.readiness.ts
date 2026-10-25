import { createFileRoute } from "@tanstack/react-router";
import { canonicalChatFactoryReport, buildFactoryGraduationReport, planCanonicalCatalogProduction } from "@mailmypdf/workflows";
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
        const production = planCanonicalCatalogProduction();
        return Response.json({
          total: workflows.length,
          chatExecutable: workflows.filter((workflow) => workflow.chatExecutable).length,
          awaitingChatContract: workflows.filter((workflow) => workflow.reason === "chat-contract-not-registered").length,
          workflows,
          graduation,
          productionPlan: {
            total: production.total,
            complete: production.complete,
            unfinished: production.unfinished,
            readyNow: production.readyNow,
            reviewRequired: production.reviewRequired,
            orchestratorRequired: production.orchestratorRequired,
            materializerRequired: production.materializerRequired,
            adapterRequired: production.adapterRequired,
            families: production.families,
          },
        }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
