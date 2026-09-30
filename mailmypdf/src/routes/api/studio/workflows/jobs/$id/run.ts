import { createFileRoute } from "@tanstack/react-router";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";
import { adminFactoryAccess } from "@/studio/access";
import { runPersistentFactoryJobToBoundary } from "@/studio/factory-job.server";
import { FACTORY_JOB_ID, factoryJobErrorResponse } from "@/studio/factory-http.server";

export const Route = createFileRoute("/api/studio/workflows/jobs/$id/run")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const access = await adminFactoryAccess(request);
        if (access.error) return access.error;
        if (!FACTORY_JOB_ID.test(params.id)) {
          return Response.json({ error: "Invalid factory job ID." }, { status: 400 });
        }
        try {
          const job = await runPersistentFactoryJobToBoundary({
            jobId: params.id,
            actorId: access.actor.userId,
            availableTools: MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
          });
          return Response.json({ job }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
