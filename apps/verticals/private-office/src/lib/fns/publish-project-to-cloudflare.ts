import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { studioFileScanAuthMiddleware } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";

const inputSchema = z.object({
  projectId: z.string(),
  /** Which app under apps/verticals/<verticalId> (or "mailmypdf" for core) to build+deploy. */
  verticalId: z.string(),
  confirmed: z.boolean().optional(),
});

/**
 * Deploys one app to its own Cloudflare Pages project, following the same
 * build -> wrangler pages deploy shape as the two verticals that already have
 * working CI (code-enforcement, records-request).
 *
 * Requires studioProjects[].cloudflare to be configured for the target — most
 * verticals don't have this wired yet (only 2 of 10 have a working deploy
 * pipeline today), so this returns a clear "not configured" result rather than
 * attempting a deploy with no target.
 */
export const publishProjectToCloudflare = createServerFn({ method: "POST" })
  .middleware([studioFileScanAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const project = findStudioProject(data.projectId);
    if (!project) throw new Error(`Unknown Studio project: ${data.projectId}`);

    if (!project.cloudflare) {
      return {
        deployed: false,
        message: `Deploy is not configured for ${project.name} yet. Add a Cloudflare Pages project name and API token env var to studioProjects before publishing.`,
      };
    }

    if (!data.confirmed) {
      return {
        deployed: false,
        message: `This will build ${data.verticalId} and deploy it to the "${project.cloudflare.projectName}" Cloudflare Pages project. Confirm to proceed.`,
      };
    }

    const apiToken = process.env[project.cloudflare.accountEnvVar];
    if (!apiToken) {
      return {
        deployed: false,
        message: `Missing ${project.cloudflare.accountEnvVar} on the server — cannot authenticate with Cloudflare.`,
      };
    }

    // Dynamic imports: this file is imported by studio.tsx (a client
    // component), so Node built-ins must stay out of top-level imports.
    const path = (await import("node:path")).default;
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);

    const rootDir = await resolveProjectRoot(project);
    const appDir =
      data.verticalId === "mailmypdf"
        ? path.join(rootDir, "apps/mailmypdf")
        : path.join(rootDir, "apps/verticals", data.verticalId);

    await run(
      "pnpm",
      ["--filter", data.verticalId === "mailmypdf" ? "tanstack_start_ts" : data.verticalId, "run", "build"],
      { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 },
    );

    const outputDir = path.join(appDir, "dist");
    const { stdout } = await run(
      "npx",
      ["wrangler", "pages", "deploy", outputDir, "--project-name", project.cloudflare.projectName],
      {
        cwd: appDir,
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, CLOUDFLARE_API_TOKEN: apiToken },
      },
    );

    return { deployed: true, message: `Deployed to ${project.cloudflare.projectName}.`, output: stdout };
  });
