/**
 * Projects available to the authenticated Studio.
 *
 * MailMyPDF is the canonical monorepo project. Deployment metadata here is
 * intentionally declarative; it does not contain credentials and it does not
 * make remote production deploys possible by itself.
 */

export type StudioProjectCloudflareTarget = {
  deployment: "workers-script";
  /** Server-side env var containing the Cloudflare API token for local Studio deploys. */
  tokenEnvVar: string;
  /** Optional server-side Cloudflare account id env var. */
  accountIdEnvVar?: string;
  /** Canonical Cloudflare Worker name. */
  workerName: string;
  /** Repo-relative canonical application directory. */
  appPath: string;
  /** App-relative deployment script. */
  deployScript: string;
};

export type StudioProject = {
  id: string;
  name: string;
  /** Absolute path to the repo root on disk (server-side only). */
  rootDir: string;
  repoUrl: string;
  defaultBranch: string;
  /** Declarative deploy target. Credentials remain server-side. */
  cloudflare: StudioProjectCloudflareTarget | null;
};

// This file is imported by client components, so keep Node built-ins out of
// top-level imports. resolveProjectRoot performs filesystem discovery lazily.
export const studioProjects: StudioProject[] = [
  {
    id: "mailmypdf",
    name: "MailMyPDF",
    rootDir: "",
    repoUrl: "https://github.com/mycomind4-arch/mailmypdf-all",
    defaultBranch: "main",
    cloudflare: {
      deployment: "workers-script",
      tokenEnvVar: "CLOUDFLARE_API_TOKEN",
      accountIdEnvVar: "CLOUDFLARE_ACCOUNT_ID",
      workerName: "mailmypdf",
      appPath: "mailmypdf",
      deployScript: "deploy.sh",
    },
  },
];

/**
 * Server-only: locate the current monorepo root without assuming the retired
 * apps/verticals directory depth.
 */
export async function resolveProjectRoot(project: StudioProject): Promise<string> {
  if (project.rootDir) return project.rootDir;

  const path = await import("node:path");
  const { promises: fs } = await import("node:fs");
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.resolve(cwd, ".."),
    path.resolve(cwd, "../.."),
    path.resolve(cwd, "../../.."),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "pnpm-workspace.yaml"));
      await fs.access(path.join(candidate, "mailmypdf", "package.json"));
      return candidate;
    } catch {
      // Try the next plausible workspace root.
    }
  }

  throw new Error(
    `Could not locate the MailMyPDF workspace root from ${cwd}. Expected pnpm-workspace.yaml and mailmypdf/package.json.`,
  );
}

export function findStudioProject(projectId: string): StudioProject | undefined {
  return studioProjects.find((project) => project.id === projectId);
}
