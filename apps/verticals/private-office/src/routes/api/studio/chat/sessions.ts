import { createFileRoute } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import { isLocalDevelopmentHost } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { listChatSessions, getProviderAvailability } from "@mailmypdf/dev-agent-swarm";

export const Route = createFileRoute("/api/studio/chat/sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isLocalDevelopmentHost(request.headers.get("host"), process.env.NODE_ENV)) {
          try {
            await requireAuthenticatedUser(request);
          } catch {
            return Response.json({ error: "Not authorized." }, { status: 401 });
          }
        }

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        const [sessions, availability] = await Promise.all([listChatSessions(repoRoot), getProviderAvailability()]);
        return Response.json({ sessions, availability });
      },
    },
  },
});
