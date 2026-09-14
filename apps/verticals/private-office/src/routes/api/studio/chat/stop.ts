import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/lib/studio-access";
import { z } from "zod";
import { stopChatMessage } from "@mailmypdf/dev-agent-swarm";

const bodySchema = z.object({ sessionId: z.string().trim().min(1).max(200) });

export const Route = createFileRoute("/api/studio/chat/stop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = studioAccessError(request);
        if (accessError) return accessError;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "A sessionId is required." }, { status: 400 });
        const stopped = stopChatMessage(parsed.data.sessionId);
        return Response.json({ stopped });
      },
    },
  },
});
