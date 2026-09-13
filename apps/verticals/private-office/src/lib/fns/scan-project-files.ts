import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { promises as FsPromises } from "node:fs";
import type PathModule from "node:path";
import { requireAuthenticatedUser } from "@/lib/auth-guard";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";

export type StudioFileTreeNode = {
  path: string;
  label: string;
  kind: "directory" | "file";
  children?: StudioFileTreeNode[];
};

const OMITTED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".output",
  ".tanstack",
  ".turbo",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);

export function isLocalDevelopmentHost(host: string | null, environment: string | undefined): boolean {
  if (environment !== "development" || !host) return false;
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1).toLowerCase() : host.split(":", 1)[0]?.toLowerCase();
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

// Studio is useful before a user has configured an account. Keep that
// convenience strictly to the local development server; all other requests
// must still pass the standard account boundary.
export const studioFileScanAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => next())
  .server(async ({ next, request }) => {
    if (isLocalDevelopmentHost(request.headers.get("host"), process.env.NODE_ENV)) return next();
    const user = await requireAuthenticatedUser(request);
    return next({ context: { user } });
  });

/** Converts a project-relative path into safe path segments. */
export function normalizeProjectRelativePath(relativePath?: string): string[] {
  if (!relativePath) return [];
  if (relativePath.startsWith("/") || relativePath.includes("\\")) {
    throw new Error("Invalid project path");
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid project path");
  }
  return segments;
}

type NodeFs = typeof FsPromises;
type NodePath = typeof PathModule;

async function listDirectory(
  io: { fs: NodeFs; path: NodePath },
  rootDir: string,
  relativePath: string,
  label: string,
): Promise<StudioFileTreeNode> {
  const segments = normalizeProjectRelativePath(relativePath);
  const target = io.path.resolve(rootDir, ...segments);
  const rootPrefix = `${rootDir}${io.path.sep}`;
  if (target !== rootDir && !target.startsWith(rootPrefix)) throw new Error("Invalid project path");

  const entries = await io.fs.readdir(target, { withFileTypes: true });
  const children = entries
    .filter((entry) => !(entry.isDirectory() && OMITTED_DIRECTORIES.has(entry.name)))
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .map((entry) => ({
      path: relativePath ? `${relativePath}/${entry.name}` : entry.name,
      label: entry.name,
      kind: entry.isDirectory() ? "directory" as const : "file" as const,
    }));

  return { path: relativePath, label, kind: "directory", children };
}

/** Lists the current contents of a project directory; the UI loads folders as they are expanded. */
export const scanProjectFiles = createServerFn({ method: "GET" })
  .middleware([studioFileScanAuthMiddleware])
  .validator(z.object({ projectId: z.string(), path: z.string().optional() }))
  .handler(async ({ data }): Promise<StudioFileTreeNode> => {
    const project = findStudioProject(data.projectId);
    if (!project) throw new Error(`Unknown Studio project: ${data.projectId}`);

    const { promises: fs } = await import("node:fs");
    const path = (await import("node:path")).default;
    const rootDir = await resolveProjectRoot(project);
    return listDirectory({ fs, path }, rootDir, data.path ?? "", data.path || project.name);
  });
