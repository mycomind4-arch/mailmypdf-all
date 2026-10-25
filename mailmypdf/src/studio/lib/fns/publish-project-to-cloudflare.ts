import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { studioFileScanAuthMiddleware } from "@/studio/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/studio/domain/studio-project";

const inputSchema = z.object({
  projectId: z.string(),
  confirmed: z.boolean().optional(),
});

/**
 * Local-development deployment helper for the canonical MailMyPDF Worker.
 *
 * This deliberately reuses mailmypdf/deploy.sh rather than reproducing build,
 * preflight, cron, wrangler, deployment verification, and MCP launch-readiness
 * logic inside Studio. studioFileScanAuthMiddleware keeps this machine-level
 * operation local-only even though the Studio UI itself can be used remotely.
 */
export const publishProjectToCloudflare = createServerFn({ method: "POST" })
  .middleware([studioFileScanAuthMiddleware])
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const project = findStudioProject(data.projectId);
    if (!project) throw new Error(`Unknown Studio project: ${data.projectId}`);

    const target = project.cloudflare;
    if (!target) {
      return {
        deployed: false,
        message: `Cloudflare deployment is not configured for ${project.name}.`,
      };
    }

    if (target.deployment !== "workers-script") {
      return {
        deployed: false,
        message: `Unsupported Studio deployment mode: ${target.deployment}`,
      };
    }

    if (!data.confirmed) {
      return {
        deployed: false,
        message:
          `This will run ${target.appPath}/${target.deployScript} and deploy the current working tree to the "${target.workerName}" Cloudflare Worker. The canonical script runs production preflight, builds the app, deploys cron configuration, verifies the deployed website, and runs MCP launch-readiness. Confirm to proceed.`,
      };
    }

    const apiToken = process.env[target.tokenEnvVar]?.trim();
    if (!apiToken) {
      return {
        deployed: false,
        message:
          `Missing ${target.tokenEnvVar} in the local Studio server environment. No deployment was attempted.`,
      };
    }

    const path = (await import("node:path")).default;
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);

    const rootDir = await resolveProjectRoot(project);
    const appDir = path.join(rootDir, target.appPath);
    const scriptPath = path.join(appDir, target.deployScript);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
    };
    if (target.accountIdEnvVar) {
      const accountId = process.env[target.accountIdEnvVar]?.trim();
      if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;
    }

    try {
      const { stdout, stderr } = await run("bash", [scriptPath], {
        cwd: appDir,
        maxBuffer: 30 * 1024 * 1024,
        env,
      });

      return {
        deployed: true,
        message:
          `Deployed and verified the "${target.workerName}" Cloudflare Worker using the canonical MailMyPDF deploy script.`,
        output: [stdout, stderr].filter(Boolean).join("\n").slice(-20_000),
      };
    } catch (error) {
      const cause = error as Error & { stdout?: string; stderr?: string };
      const details = [cause.stdout, cause.stderr, cause.message]
        .filter(Boolean)
        .join("\n")
        .slice(-20_000);
      return {
        deployed: false,
        message:
          `Cloudflare Worker deployment failed. The canonical deploy script stopped before reporting success.\n${details}`,
      };
    }
  });
