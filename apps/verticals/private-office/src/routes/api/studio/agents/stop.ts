import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import { isLocalDevelopmentHost } from "@/lib/fns/scan-project-files";
import { stopRun } from "@mailmypdf/dev-agent-swarm";

const bodySchema = z.object({ runId: z.string().trim().min(1).max(200) });

export const Route = createFileRoute("/api/studio/agents/stop")({
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
        if (!parsed.success) return Response.json({ error: "A runId is required." }, { status: 400 });
        const stopped = stopRun(parsed.data.runId);
        return Response.json({ stopped });
      },
    },
  },
});
