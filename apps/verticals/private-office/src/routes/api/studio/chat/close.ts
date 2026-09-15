import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/lib/studio-access";
import { z } from "zod";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { closeChatSession } from "@mailmypdf/dev-agent-swarm";

const bodySchema = z.object({ sessionId: z.string().trim().min(1).max(200) });

export const Route = createFileRoute("/api/studio/chat/close")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = studioAccessError(request);
        if (accessError) return accessError;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "A sessionId is required." }, { status: 400 });

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        const result = await closeChatSession(repoRoot, parsed.data.sessionId);
        return Response.json(result, { status: result.pass ? 200 : 409 });
      },
    },
  },
});
