/**
 * A "Project" Studio can open. MailMyPDF is the first project registered here,
 * but Studio itself is generic — the tree scan, GitHub sync, and Cloudflare
 * publish actions all take a `projectId` and look up its root/repo here rather
 * than hardcoding MailMyPDF anywhere else. Adding a second project later is a
 * new entry in this array, not a rewrite.
 */

export type StudioProjectCloudflareTarget = {
  /** Name of the env var (server-side) holding the Cloudflare API token to use. */
  accountEnvVar: string;
  /** Cloudflare Pages project name to deploy to. */
  projectName: string;
};

export type StudioProject = {
  id: string;
  name: string;
  /** Absolute path to the repo root on disk (server-side only). */
  rootDir: string;
  repoUrl: string;
  defaultBranch: string;
  /** Deploy target for the project's core app; null until wired. */
  cloudflare: StudioProjectCloudflareTarget | null;
};

// This file is imported by client components (Studio's sidebar reads
// project.name/id), so it must stay free of Node built-ins. `rootDir` is
// resolved lazily, server-side only, by `resolveProjectRoot` below — never at
// module load — otherwise Node imports leak into the browser bundle.
export const studioProjects: StudioProject[] = [
  {
    id: "mailmypdf",
    name: "MailMyPDF",
    rootDir: "", // see resolveProjectRoot
    repoUrl: "https://github.com/mycomind4-arch/mailmypdf-all",
    defaultBranch: "main",
    cloudflare: null,
  },
];

/**
 * Server-only: resolves a project's absolute repo root on disk. Dynamic
 * imports keep Node's `path`/`process` out of any bundle this module's other
 * exports end up in client-side.
 */
export async function resolveProjectRoot(project: StudioProject): Promise<string> {
  if (project.rootDir) return project.rootDir;
  const path = await import("node:path");
  // vite dev / server fns run with cwd = the app package dir
  // (apps/verticals/private-office), so the repo root is 3 levels up.
  return path.resolve(process.cwd(), "../../..");
}

export function findStudioProject(projectId: string): StudioProject | undefined {
  return studioProjects.find((project) => project.id === projectId);
}
