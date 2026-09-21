import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";
import { listRuns, getProviderAvailability } from "@mailmypdf/dev-agent-swarm";

export const Route = createFileRoute("/api/studio/agents/runs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        const [runs, availability] = await Promise.all([listRuns(repoRoot), getProviderAvailability()]);
        return Response.json({ runs, availability });
      },
    },
  },
});
