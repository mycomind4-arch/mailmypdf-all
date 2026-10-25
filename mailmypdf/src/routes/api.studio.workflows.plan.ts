import { createFileRoute } from "@tanstack/react-router";
import { planWorkflowFromProblem } from "@mailmypdf/workflows";
import { adminFactoryAccessError } from "@/studio/access";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";

export const Route = createFileRoute("/api/studio/workflows/plan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = await adminFactoryAccessError(request);
        if (accessError) return accessError;
        const body = await request.json().catch(() => null);
        const problem = body && typeof body === "object" && !Array.isArray(body)
          ? (body as Record<string, unknown>).problem : null;
        if (typeof problem !== "string" || !problem.trim() || problem.length > 4000) {
          return Response.json({ error: "Provide a problem description of up to 4000 characters." }, { status: 400 });
        }
        return Response.json(planWorkflowFromProblem(problem, MAILMYPDF_MCP_TOOLS.map((tool) => tool.name)), {
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
