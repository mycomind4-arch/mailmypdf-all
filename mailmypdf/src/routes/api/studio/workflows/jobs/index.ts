import { createFileRoute } from "@tanstack/react-router";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";
import { adminFactoryAccess } from "@/studio/access";
import {
  createPersistentFactoryJob,
  listPersistentFactoryJobs,
  runPersistentFactoryJobToBoundary,
} from "@/studio/factory-job.server";
import { factoryJobErrorResponse } from "@/studio/factory-http.server";

export const Route = createFileRoute("/api/studio/workflows/jobs/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const access = await adminFactoryAccess(request);
        if (access.error) return access.error;
        try {
          const jobs = await listPersistentFactoryJobs(50);
          return Response.json({ jobs }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        const access = await adminFactoryAccess(request);
        if (access.error) return access.error;

        const body = await request.json().catch(() => null);
        const problem =
          body && typeof body === "object" && !Array.isArray(body)
            ? (body as Record<string, unknown>).problem
            : null;
        if (typeof problem !== "string") {
          return Response.json({ error: "Provide a problem description." }, { status: 400 });
        }

        try {
          const created = await createPersistentFactoryJob({
            problem,
            actorId: access.actor.userId,
          });
          const job = await runPersistentFactoryJobToBoundary({
            jobId: created.id,
            actorId: access.actor.userId,
            availableTools: MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
          });
          return Response.json({ job }, {
            status: 201,
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
