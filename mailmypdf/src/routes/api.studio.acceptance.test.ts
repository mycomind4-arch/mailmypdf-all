import { createFileRoute } from "@tanstack/react-router";
import { studioAccessError } from "@/studio/access";
import { z } from "zod";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";

// Runs a workflow's real acceptance test by shelling out to the one CLI the
// engine's architecture doc calls "the stable contract a future GUI panel
// should call" (packages/workflow-acceptance/bin/studio.mjs) — see
// docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md. No engine logic is
// reimplemented here; this route only validates input against the registry
// and translates the CLI's stdout/exit code into an HTTP response.

const bodySchema = z.object({
  workflowId: z.string().trim().min(1).max(100),
  scenario: z.string().trim().min(1).max(100).optional(),
});

type AcceptanceRegistryEntry = {
  vertical: string;
  verticalDir: string;
  scenariosDir: string;
};

export const Route = createFileRoute("/api/studio/acceptance/test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // This spawns a vitest subprocess against the real repo — keep it to
        // the same local-dev-only boundary scan-project-files.ts uses rather
        // than opening it to any authenticated request.
        const accessError = await studioAccessError(request);
        if (accessError) return accessError;

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "A workflowId is required." }, { status: 400 });
        }
        const { workflowId, scenario } = parsed.data;

        const project = findStudioProject("mailmypdf");
        if (!project) {
          return Response.json({ error: "Studio's root project is not registered." }, { status: 500 });
        }
        const repoRoot = await resolveProjectRoot(project);

        const { promises: fs } = await import("node:fs");
        const path = (await import("node:path")).default;

        const registryPath = path.join(repoRoot, "packages", "workflow-acceptance", "registry", "workflows.json");
        let registry: Record<string, AcceptanceRegistryEntry>;
        try {
          registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
        } catch {
          return Response.json({ error: "Acceptance registry could not be read." }, { status: 500 });
        }

        // Closed whitelist: workflowId (and, below, scenario) must match
        // what's actually registered/on disk before touching child_process.
        const entry = registry[workflowId];
        if (!entry) {
          return Response.json({ error: `"${workflowId}" has no registered acceptance test.` }, { status: 404 });
        }

        const args = ["workflow", "test", workflowId, "--json"];
        if (scenario) {
          const scenariosAbsDir = path.join(repoRoot, entry.verticalDir, entry.scenariosDir);
          let scenarioDirs: string[];
          try {
            scenarioDirs = (await fs.readdir(scenariosAbsDir, { withFileTypes: true }))
              .filter((item) => item.isDirectory())
              .map((item) => item.name);
          } catch {
            scenarioDirs = [];
          }
          if (!scenarioDirs.includes(scenario)) {
            return Response.json({ error: `Unknown scenario "${scenario}" for "${workflowId}".` }, { status: 400 });
          }
          args.push("--fixture", scenario);
        } else {
          args.push("--all-scenarios");
        }

        const cliPath = path.join(repoRoot, "packages", "workflow-acceptance", "bin", "studio.mjs");
        const { spawn } = await import("node:child_process");

        const result = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
          const child = spawn(process.execPath, [cliPath, ...args], { cwd: repoRoot });
          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (chunk) => { stdout += chunk; });
          child.stderr.on("data", (chunk) => { stderr += chunk; });
          child.on("close", (exitCode) => resolve({ stdout, stderr, exitCode }));
        });

        // Exit codes per bin/studio.mjs: 0 pass, 1 acceptance failure (still
        // a real report), 2 configuration error, 3 workflow could not run.
        if (result.exitCode === 0 || result.exitCode === 1) {
          try {
            return Response.json(JSON.parse(result.stdout));
          } catch {
            return Response.json(
              { error: "The acceptance test ran but its report could not be parsed.", stdout: result.stdout, stderr: result.stderr },
              { status: 500 },
            );
          }
        }

        return Response.json(
          { error: `The acceptance test could not run (exit code ${result.exitCode}).`, stdout: result.stdout, stderr: result.stderr },
          { status: 500 },
        );
      },
    },
  },
});
