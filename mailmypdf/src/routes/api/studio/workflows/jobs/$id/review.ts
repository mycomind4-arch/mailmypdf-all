import { createFileRoute } from "@tanstack/react-router";
import { MAILMYPDF_MCP_TOOLS } from "@/lib/mcp/tool-catalog";
import type { ReviewedFactoryTemplateRequest } from "@mailmypdf/workflows";
import { adminFactoryAccess } from "@/studio/access";
import {
  approvePersistentFactoryJobReview,
  runPersistentFactoryJobToBoundary,
} from "@/studio/factory-job.server";
import { FACTORY_JOB_ID, factoryJobErrorResponse } from "@/studio/factory-http.server";

export const Route = createFileRoute("/api/studio/workflows/jobs/$id/review")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const access = await adminFactoryAccess(request);
        if (access.error) return access.error;
        if (!FACTORY_JOB_ID.test(params.id)) {
          return Response.json({ error: "Invalid factory job ID." }, { status: 400 });
        }
        try {
          const body = await request.json().catch(() => null);
          const templateRequest =
            body && typeof body === "object" && !Array.isArray(body)
              ? (body as Record<string, unknown>).templateRequest
              : undefined;

          const approved = await approvePersistentFactoryJobReview({
            jobId: params.id,
            actorId: access.actor.userId,
            templateRequest:
              templateRequest && typeof templateRequest === "object" && !Array.isArray(templateRequest)
                ? templateRequest as ReviewedFactoryTemplateRequest
                : undefined,
          });

          const job = approved.stage === "build"
            ? await runPersistentFactoryJobToBoundary({
                jobId: approved.id,
                actorId: access.actor.userId,
                availableTools: MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
              })
            : approved;

          return Response.json({ job }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
