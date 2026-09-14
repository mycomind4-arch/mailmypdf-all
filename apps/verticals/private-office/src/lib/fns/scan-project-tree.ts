import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { promises as FsPromises } from "node:fs";
import type PathModule from "node:path";
import { studioFileScanAuthMiddleware } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { studioVerticals, studioCatalog } from "@/domain/studio-ecosystem";

export type StudioTreeNodeKind =
  | "core"
  | "verticals-folder"
  | "vertical"
  | "folder"
  | "route"
  | "workflows-folder"
  | "workflow";

export type StudioTreeNode = {
  path: string;
  label: string;
  kind: StudioTreeNodeKind;
  verticalId?: string;
  publicPath?: string;
  status?: string;
  children?: StudioTreeNode[];
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".turbo",
  ".tanstack",
  ".output",
  ".wrangler",
  ".git",
  "dist",
  "coverage",
  ".lovable",
]);

const ROUTE_FILE_EXT = /\.(tsx|ts)$/;
const TEST_FILE = /\.test\.(tsx|ts)$/;

function titleCase(segment: string): string {
  return segment
    .replace(/^\$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best-effort mapping of a route file's relative path to its public URL. */
function toPublicPath(relativeToRoutes: string): string {
  const noExt = relativeToRoutes.replace(ROUTE_FILE_EXT, "");
  const segments = noExt.split("/").filter((segment) => segment !== "index");
  const cleaned = segments.map((segment) =>
    segment.startsWith("$") ? `:${segment.slice(1)}` : segment,
  );
  return "/" + cleaned.join("/");
}

type NodeFs = typeof FsPromises;
type NodePath = typeof PathModule;

async function listRouteDir(
  io: { fs: NodeFs; path: NodePath },
  absDir: string,
  relativeToRoutes: string,
  verticalId: string | undefined,
  depth: number,
  maxDepth: number,
): Promise<StudioTreeNode[]> {
  let entries;
  try {
    entries = await io.fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: StudioTreeNode[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const entryRelative = relativeToRoutes ? `${relativeToRoutes}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const isWorkflows = entry.name === "workflows";
      const childAbsDir = io.path.join(absDir, entry.name);
      const children =
        depth < maxDepth
          ? await listRouteDir(io, childAbsDir, entryRelative, verticalId, depth + 1, maxDepth)
          : [];

      if (isWorkflows) {
        // Join each workflow file against the existing catalog for its status.
        const withStatus = children.map((child) => {
          if (!child.publicPath || !verticalId) return child;
          const match = studioCatalog.find(
            (row) => row.verticalId === verticalId && row.publicPath === child.publicPath,
          );
          return match ? { ...child, kind: "workflow" as const, status: match.status } : child;
        });
        nodes.push({
          path: entryRelative,
          label: "Workflows",
          kind: "workflows-folder",
          verticalId,
          children: withStatus,
        });
      } else {
        nodes.push({
          path: entryRelative,
          label: titleCase(entry.name),
          kind: "folder",
          verticalId,
          children,
        });
      }
      continue;
    }

    if (!ROUTE_FILE_EXT.test(entry.name) || TEST_FILE.test(entry.name)) continue;
    nodes.push({
      path: entryRelative,
      label: entry.name === "index.tsx" || entry.name === "index.ts"
        ? "Index"
        : titleCase(entry.name.replace(ROUTE_FILE_EXT, "")),
      kind: "route",
      verticalId,
      publicPath: toPublicPath(entryRelative),
    });
  }
  return nodes;
}

export const scanProjectTree = createServerFn({ method: "GET" })
  .middleware([studioFileScanAuthMiddleware])
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ data }): Promise<StudioTreeNode> => {
    const project = findStudioProject(data.projectId);
    if (!project) throw new Error(`Unknown Studio project: ${data.projectId}`);

    // Dynamic imports: this file is imported by client components (studio.tsx
    // calls scanProjectTree directly), so Node built-ins must never be
    // top-level imports here or they leak into the browser bundle.
    const { promises: fs } = await import("node:fs");
    const path = (await import("node:path")).default;
    const io = { fs, path };
    const rootDir = await resolveProjectRoot(project);

    const coreRoutesDir = path.join(rootDir, "apps/mailmypdf/src/routes");
    const coreChildren = await listRouteDir(io, coreRoutesDir, "", undefined, 0, 1);

    const verticalNodes: StudioTreeNode[] = [];
    for (const vertical of studioVerticals) {
      const routesDir = path.join(rootDir, "apps/verticals", vertical.id, "src/routes");
      const children = await listRouteDir(io, routesDir, "", vertical.id, 0, 2);
      verticalNodes.push({
        path: `apps/verticals/${vertical.id}`,
        label: vertical.title,
        kind: "vertical",
        verticalId: vertical.id,
        publicPath: "/",
        children,
      });
    }

    return {
      path: "apps/mailmypdf",
      label: project.name,
      kind: "core",
      publicPath: "/",
      children: [
        ...coreChildren,
        {
          path: "apps/verticals",
          label: "Verticals",
          kind: "verticals-folder",
          children: verticalNodes,
        },
      ],
    };
  });
