import { createFileRoute } from "@tanstack/react-router";
import { adminFactoryAccess } from "@/studio/access";
import { approvePersistentFactoryJobReview } from "@/studio/factory-job.server";
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
          const source =
            body && typeof body === "object" && !Array.isArray(body)
              ? (body as Record<string, unknown>)
              : null;
          const buildRequest =
            source &&
            source.family === "records-request" &&
            source.sectionId === "records-request" &&
            source.startTemplate === "records-request" &&
            typeof source.workflowId === "string" &&
            typeof source.label === "string"
              ? {
                  family: "records-request" as const,
                  sectionId: "records-request" as const,
                  workflowId: source.workflowId,
                  label: source.label,
                  startTemplate: "records-request" as const,
                }
              : undefined;

          const job = await approvePersistentFactoryJobReview({
            jobId: params.id,
            actorId: access.actor.userId,
            buildRequest,
          });
          return Response.json({ job }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
