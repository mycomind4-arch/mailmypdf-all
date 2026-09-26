import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/** Source-level checks run before any build, so stale dist files cannot hide drift. */
export function workflowRegistryTopologyIssues(root, sectionIds, input) {
  const workflows = input ?? JSON.parse(readFileSync(resolve(root, "packages/workflows/src/canonical-workflows.json"), "utf8"));
  const issues = [];
  const ids = new Set();
  const exists = (path) => existsSync(resolve(root, path));
  const startSource = readFileSync(resolve(root, "mailmypdf/src/lib/workflow-start-registry.tsx"), "utf8");
  const starts = [...startSource.matchAll(/^\s+"([a-z0-9-]+):([a-z0-9-]+)":/gm)].map((match) => `${match[1]}/${match[2]}`);
  const executableIds = new Set();
  for (const workflow of workflows) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(workflow.id)) {
      issues.push(`Invalid workflow identity: ${workflow.id}`);
      continue;
    }
    if (ids.has(workflow.id)) issues.push(`Duplicate workflow identity: ${workflow.id}`);
    ids.add(workflow.id);
    const [section, slug] = workflow.id.split("/");
    if (!sectionIds.includes(section)) issues.push(`Unknown section: ${workflow.id}`);
    const path = `${section}/workflows/${slug}`;
    if (!exists(`${path}/config.ts`)) issues.push(`Missing workflow config: ${workflow.id}`);
    if (workflow.execution) {
      executableIds.add(workflow.id);
      for (const file of [workflow.execution.definition === "step-workflow" ? "step-workflow.ts" : "manifest.ts", "start/index.tsx"]) {
        if (!exists(`${path}/${file}`)) issues.push(`Missing execution implementation ${file}: ${workflow.id}`);
      }
      if (workflow.execution.entry === "workspace-start" && !starts.includes(workflow.id)) {
        issues.push(`Missing workspace start component: ${workflow.id}`);
      }
      if (workflow.execution.entry === "public-start" &&
          !exists(`mailmypdf/src/routes/${path}/start/index.tsx`) && !exists(`mailmypdf/src/routes/${path}/start.tsx`)) {
        issues.push(`Missing public start route: ${workflow.id}`);
      }
    }
    if (workflow.authority) {
      const module = `mailmypdf/src/lib/workflow-seo-entries/${workflow.authority.module}.ts`;
      if (!exists(module)) issues.push(`Missing authority module: ${workflow.id}`);
      else if (!readFileSync(resolve(root, module), "utf8").includes(`id: "${workflow.id}"`)) {
        issues.push(`Authority module identity drift: ${workflow.id}`);
      }
    }
  }
  for (const section of sectionIds) {
    const path = resolve(root, section, "workflows");
    if (!existsSync(path)) continue;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() && exists(`${section}/workflows/${entry.name}/config.ts`) && !ids.has(`${section}/${entry.name}`)) {
        issues.push(`Unregistered root workflow: ${section}/${entry.name}`);
      }
    }
  }
  for (const id of starts) {
    if (!executableIds.has(id)) issues.push(`Start component has no execution binding: ${id}`);
  }
  return issues;
}
