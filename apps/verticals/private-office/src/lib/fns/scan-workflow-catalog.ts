import { createServerFn } from "@tanstack/react-start";
import { studioFileScanAuthMiddleware } from "@/lib/fns/scan-project-files";
import { findStudioProject, resolveProjectRoot } from "@/domain/studio-project";
import { studioCatalog, studioVerticals, type StudioCatalogWorkflow } from "@/domain/studio-ecosystem";

// A vertical's directory under the repo root, when it isn't simply
// `apps/verticals/<verticalId>` (only mailmypdf lives outside that tree).
const VERTICAL_DIR_OVERRIDES: Record<string, string> = {
  mailmypdf: "apps/mailmypdf",
};

function verticalRelDir(verticalId: string): string {
  return VERTICAL_DIR_OVERRIDES[verticalId] ?? `apps/verticals/${verticalId}`;
}

// Generic route-action filenames that show up inside a workflows/ directory
// but aren't themselves a workflow (server routes for a dynamic `$workflowId`
// segment, or shared helpers) — excluded from both "onDisk" checks and
// discovery so they don't show up as phantom workflows.
const NON_WORKFLOW_FILENAMES = new Set(["index", "analyze", "draft", "approve", "checkout", "webhook"]);

function humanizeId(id: string): string {
  return id
    .split("-")
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

type VerticalScan = {
  staticIds: Set<string>;
  hasDynamicRoute: boolean;
};

async function scanVerticalWorkflowsDir(
  fs: typeof import("node:fs").promises,
  path: typeof import("node:path"),
  repoRoot: string,
  verticalId: string,
): Promise<VerticalScan> {
  const dir = path.join(repoRoot, verticalRelDir(verticalId), "src", "routes", "workflows");
  const result: VerticalScan = { staticIds: new Set(), hasDynamicRoute: false };
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith("$")) {
      result.hasDynamicRoute = true;
      continue;
    }
    if (!entry.isFile() || !name.endsWith(".tsx") || name.endsWith(".test.tsx")) continue;
    const id = name.slice(0, -".tsx".length);
    if (NON_WORKFLOW_FILENAMES.has(id)) continue;
    result.staticIds.add(id);
  }
  return result;
}

type AcceptanceRegistryEntry = {
  vertical: string;
  verticalDir: string;
  scenariosDir: string;
};

async function loadAcceptanceCoverage(
  fs: typeof import("node:fs").promises,
  path: typeof import("node:path"),
  repoRoot: string,
): Promise<Map<string, string[]>> {
  const coverage = new Map<string, string[]>();
  const registryPath = path.join(repoRoot, "packages", "workflow-acceptance", "registry", "workflows.json");
  let raw: string;
  try {
    raw = await fs.readFile(registryPath, "utf8");
  } catch {
    return coverage;
  }
  const registry = JSON.parse(raw) as Record<string, AcceptanceRegistryEntry>;
  for (const [workflowId, entry] of Object.entries(registry)) {
    const scenariosAbsDir = path.join(repoRoot, entry.verticalDir, entry.scenariosDir);
    let scenarioEntries;
    try {
      scenarioEntries = await fs.readdir(scenariosAbsDir, { withFileTypes: true });
    } catch {
      coverage.set(workflowId, []);
      continue;
    }
    const scenarioIds: string[] = [];
    for (const scenarioEntry of scenarioEntries) {
      if (!scenarioEntry.isDirectory()) continue;
      try {
        await fs.access(path.join(scenariosAbsDir, scenarioEntry.name, "scenario.json"));
        scenarioIds.push(scenarioEntry.name);
      } catch {
        // Not a real scenario directory (no scenario.json) — skip.
      }
    }
    coverage.set(workflowId, scenarioIds);
  }
  return coverage;
}

/**
 * Merges the static Studio catalog with what's actually on disk right now:
 * marks each row `onDisk`, appends any route file with no catalog entry as a
 * newly `discovered` row, and attaches acceptance-test coverage from
 * `packages/workflow-acceptance/registry/workflows.json`. The client polls
 * this the same way it already polls `scanProjectFiles`, so the workflow
 * list reflects the folder tree within a few seconds of it changing.
 */
export const scanWorkflowCatalog = createServerFn({ method: "GET" })
  .middleware([studioFileScanAuthMiddleware])
  .handler(async (): Promise<StudioCatalogWorkflow[]> => {
    const project = findStudioProject("mailmypdf");
    if (!project) throw new Error("Studio's root project is not registered.");

    const { promises: fs } = await import("node:fs");
    const path = (await import("node:path")).default;
    const repoRoot = await resolveProjectRoot(project);

    const scansByVertical = new Map<string, VerticalScan>();
    for (const vertical of studioVerticals) {
      scansByVertical.set(vertical.id, await scanVerticalWorkflowsDir(fs, path, repoRoot, vertical.id));
    }
    const acceptanceCoverage = await loadAcceptanceCoverage(fs, path, repoRoot);

    const claimedIds = new Map<string, Set<string>>();
    const merged: StudioCatalogWorkflow[] = studioCatalog.map((workflow) => {
      const scan = scansByVertical.get(workflow.verticalId);
      const scenarios = acceptanceCoverage.get(workflow.id);
      if (!claimedIds.has(workflow.verticalId)) claimedIds.set(workflow.verticalId, new Set());
      claimedIds.get(workflow.verticalId)!.add(workflow.id);

      const onDisk: StudioCatalogWorkflow["onDisk"] = !scan
        ? undefined
        : scan.staticIds.has(workflow.id)
          ? "file"
          : scan.hasDynamicRoute
            ? "dynamic"
            : "missing";

      return {
        ...workflow,
        onDisk,
        hasAcceptanceTest: scenarios !== undefined,
        acceptanceScenarios: scenarios,
      };
    });

    for (const vertical of studioVerticals) {
      const scan = scansByVertical.get(vertical.id);
      if (!scan) continue;
      const claimed = claimedIds.get(vertical.id) ?? new Set<string>();
      for (const id of scan.staticIds) {
        if (claimed.has(id)) continue;
        const scenarios = acceptanceCoverage.get(id);
        merged.push({
          id,
          verticalId: vertical.id,
          title: humanizeId(id),
          description: `Discovered from ${verticalRelDir(vertical.id)}/src/routes/workflows/${id}.tsx — no catalog metadata yet.`,
          publicPath: `/workflows/${id}`,
          status: "scaffolded",
          onDisk: "file",
          discovered: true,
          hasAcceptanceTest: scenarios !== undefined,
          acceptanceScenarios: scenarios,
        });
      }
    }

    return merged;
  });
