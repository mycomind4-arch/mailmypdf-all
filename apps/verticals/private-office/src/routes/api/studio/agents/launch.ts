import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import { isLocalDevelopmentHost } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { getProviderAvailability, startOrchestratorRun } from "@mailmypdf/dev-agent-swarm";

const modelId = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);

// Launches a Builder → Tester → Reviewer → SEO run (see
// docs/architecture — the plan this shipped from — for the full design).
// Kept to the same local-dev-only boundary as api/studio/acceptance/test.ts:
// this spawns AI-driven shell/file edits in a disposable git worktree, so it
// should not be reachable the same way a normal authenticated request is.

const bodySchema = z.object({
  verticalId: z.string().trim().min(1).max(100),
  workflowId: z.string().trim().min(1).max(100),
  instructions: z.string().trim().min(1).max(4000),
  publicPath: z.string().trim().max(300).optional(),
  builderProvider: z.enum(["claude", "codex"]).optional(),
  reviewerProvider: z.enum(["claude", "codex"]).optional(),
  builderModel: modelId.optional(),
  reviewerModel: modelId.optional(),
});

export const Route = createFileRoute("/api/studio/agents/launch")({
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
          return Response.json({ error: "verticalId, workflowId, and instructions are required." }, { status: 400 });
        }

        const availability = await getProviderAvailability();
        const wantsBuilder = parsed.data.builderProvider ?? "codex";
        const wantsReviewer = parsed.data.reviewerProvider ?? "codex";
        if (!availability[wantsBuilder]) {
          return Response.json({ error: `The "${wantsBuilder}" CLI is not installed on this machine.` }, { status: 400 });
        }
        if (!availability[wantsReviewer]) {
          return Response.json({ error: `The "${wantsReviewer}" CLI is not installed on this machine.` }, { status: 400 });
        }

        const project = findStudioProject("mailmypdf");
        if (!project) {
          return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        }
        const repoRoot = await resolveProjectRoot(project);

        const { runId } = await startOrchestratorRun({ ...parsed.data, repoRoot });
        return Response.json({ runId });
      },
    },
  },
});
