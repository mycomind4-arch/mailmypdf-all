import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { z } from "zod";
import { stopRun } from "@mailmypdf/dev-agent-swarm";

const bodySchema = z.object({ runId: z.string().trim().min(1).max(200) });

export const Route = createFileRoute("/api/studio/agents/stop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "A runId is required." }, { status: 400 });
        const stopped = stopRun(parsed.data.runId);
        return Response.json({ stopped });
      },
    },
  },
});
