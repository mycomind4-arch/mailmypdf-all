import { createFileRoute } from "@tanstack/react-router";
import { adminFactoryAccess } from "@/studio/access";
import {
  listPersistentFactoryJobEvents,
  loadPersistentFactoryJob,
} from "@/studio/factory-job.server";
import {
  FACTORY_JOB_ID,
  factoryJobErrorResponse,
} from "@/studio/factory-http.server";

export const Route = createFileRoute("/api/studio/workflows/jobs/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const access = await adminFactoryAccess(request);
        if (access.error) return access.error;
        if (!FACTORY_JOB_ID.test(params.id)) {
          return Response.json({ error: "Invalid factory job ID." }, { status: 400 });
        }

        try {
          const [job, events] = await Promise.all([
            loadPersistentFactoryJob(params.id),
            listPersistentFactoryJobEvents(params.id),
          ]);
          if (!job) return Response.json({ error: "Factory job was not found." }, { status: 404 });
          return Response.json({ job, events }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return factoryJobErrorResponse(error);
        }
      },
    },
  },
});
