import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import { isLocalDevelopmentHost } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { sendChatMessage, getProviderAvailability } from "@mailmypdf/dev-agent-swarm";

const modelId = /^[A-Za-z0-9._:-]+$/;

const bodySchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(8000),
  provider: z.enum(["claude", "codex"]).optional(),
  model: z.string().trim().min(1).max(120).regex(modelId).optional(),
});

export const Route = createFileRoute("/api/studio/chat/message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isLocalDevelopmentHost(request.headers.get("host"), process.env.NODE_ENV)) {
          try {
            await requireAuthenticatedUser(request);
          } catch {
            return Response.json({ error: "Not authorized." }, { status: 401 });
          }
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "sessionId and message are required." }, { status: 400 });
        }

        if (parsed.data.provider) {
          const availability = await getProviderAvailability();
          if (!availability[parsed.data.provider]) {
            return Response.json({ error: `The "${parsed.data.provider}" CLI is not installed on this machine.` }, { status: 400 });
          }
        }

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        try {
          const session = await sendChatMessage({ ...parsed.data, repoRoot });
          return Response.json({ session });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "The message could not be sent." }, { status: 404 });
        }
      },
    },
  },
});
