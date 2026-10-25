import { createFileRoute } from "@tanstack/react-router";
import { localAdminFactoryAccess } from "@/studio/access";
import { publishPersistentFactoryProposal } from "@/studio/factory-publication-executor.server";
import {
  FACTORY_JOB_ID,
  factoryJobErrorResponse,
} from "@/studio/factory-http.server";

export const Route = createFileRoute("/api/studio/workflows/jobs/$id/publish")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const access = await localAdminFactoryAccess(request);
        if (access.error) return access.error;
        if (!FACTORY_JOB_ID.test(params.id)) {
          return Response.json({ error: "Invalid factory job ID." }, { status: 400 });
        }
        try {
          const job = await publishPersistentFactoryProposal({
            jobId: params.id,
            actorId: access.actor.userId,
          });
          return Response.json(
            { job },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
