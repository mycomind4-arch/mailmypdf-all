import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/lib/studio-access";
import { z } from "zod";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { runChatGate, getProviderAvailability } from "@mailmypdf/dev-agent-swarm";

const bodySchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  gate: z.enum(["tester", "reviewer", "seo"]),
  provider: z.enum(["claude", "codex"]).optional(),
  model: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/).optional(),
});

export const Route = createFileRoute("/api/studio/chat/gate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = studioAccessError(request);
        if (accessError) return accessError;

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "sessionId and a valid gate are required." }, { status: 400 });
        }

        if (parsed.data.gate === "reviewer" && parsed.data.provider) {
          const availability = await getProviderAvailability();
          if (!availability[parsed.data.provider]) {
            return Response.json({ error: `The "${parsed.data.provider}" CLI is not installed on this machine.` }, { status: 400 });
          }
        }

        const project = findStudioProject("mailmypdf");
        if (!project) return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        const repoRoot = await resolveProjectRoot(project);

        try {
          const session = await runChatGate({ ...parsed.data, repoRoot });
          return Response.json({ session });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "The gate could not run." }, { status: 404 });
        }
      },
    },
  },
});
