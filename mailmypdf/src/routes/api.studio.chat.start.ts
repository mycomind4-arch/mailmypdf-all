import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { z } from "zod";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";
import { startChatSession, getProviderAvailability } from "@mailmypdf/dev-agent-swarm";

// Same local-dev-only boundary as the rest of api/studio/agents/* and
// api/studio/acceptance/test.ts: this prepares a disposable git worktree and
// will go on to spawn AI-driven shell/file edits in it.

const bodySchema = z.object({
  verticalId: z.string().trim().min(1).max(100),
  workflowId: z.string().trim().min(1).max(100),
  publicPath: z.string().trim().max(300).optional(),
  provider: z.enum(["claude", "codex"]).optional(),
});

export const Route = createFileRoute("/api/studio/chat/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "verticalId and workflowId are required." }, { status: 400 });
        }

        const availability = await getProviderAvailability();
        const provider = parsed.data.provider ?? "codex";
        if (!availability[provider]) {
          return Response.json({ error: `The "${provider}" CLI is not installed on this machine.` }, { status: 400 });
        }

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        const session = await startChatSession({ ...parsed.data, repoRoot });
        return Response.json({ session });
      },
    },
  },
});
