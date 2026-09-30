import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWorkflowMaterializationPlan,
  isMaterializerOwnedFile,
  type WorkflowMaterializationSpec,
} from "../packages/workflows/src/workflow-materialization";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const canonicalRegistryPath = join(
  repoRoot,
  "packages/workflows/src/canonical-workflows.json",
);

const args = process.argv.slice(2);
const write = args.includes("--write");
const adopt = args.includes("--adopt");
const requestedSpecs = args.filter((arg) => !arg.startsWith("--"));

function display(path: string): string {
  return relative(repoRoot, path).split(sep).join("/");
}

function insideRepo(path: string): boolean {
  const rel = relative(repoRoot, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function resolveSpecPath(input: string): string {
  const path = resolve(repoRoot, input);
  if (!insideRepo(path) || !path.endsWith("workflow.spec.json")) {
    throw new Error(`Refusing workflow spec outside repository: ${input}`);
  }
  return path;
}

function discoverSpecs(): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }
    const workflows = join(repoRoot, entry.name, "workflows");
    if (!existsSync(workflows)) continue;
    for (const workflow of readdirSync(workflows, { withFileTypes: true })) {
      if (!workflow.isDirectory()) continue;
      const candidate = join(workflows, workflow.name, "workflow.spec.json");
      if (existsSync(candidate)) found.push(candidate);
    }
  }
  return found.sort();
}

const specPaths =
  requestedSpecs.length > 0
    ? requestedSpecs.map(resolveSpecPath)
    : discoverSpecs();

if (specPaths.length === 0) {
  throw new Error(
    "No workflow.spec.json files found. Pass a spec path or add a colocated workflow spec.",
  );
}

const canonicalSeeds = JSON.parse(
  readFileSync(canonicalRegistryPath, "utf8"),
) as Array<Record<string, unknown>>;

let registryChanged = false;
const drift: string[] = [];

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function writeCanonicalRegistry(): void {
  const content =
    "[\n" +
    canonicalSeeds.map((seed) => `  ${JSON.stringify(seed)}`).join(",\n") +
    "\n]\n";
  writeFileSync(canonicalRegistryPath, content);
}

for (const specPath of specPaths) {
  const spec = JSON.parse(
    readFileSync(specPath, "utf8"),
  ) as WorkflowMaterializationSpec;
  const plan = buildWorkflowMaterializationPlan(spec);

  const configPath = join(
    repoRoot,
    plan.sectionId,
    "workflows",
    plan.slug,
    "config.ts",
  );
  if (!existsSync(configPath)) {
    throw new Error(
      `${display(specPath)} cannot materialize without reviewed public config ${display(configPath)}.`,
    );
  }

  const existingIndex = canonicalSeeds.findIndex(
    (seed) => seed.id === plan.canonicalSeed.id,
  );

  if (existingIndex < 0) {
    if (!write) {
      drift.push(
        `${plan.canonicalSeed.id}: missing canonical registry enrollment`,
      );
    } else {
      const lastSectionIndex = canonicalSeeds.reduce(
        (last, seed, index) =>
          typeof seed.id === "string" &&
          seed.id.startsWith(`${plan.sectionId}/`)
            ? index
            : last,
        -1,
      );
      canonicalSeeds.splice(
        lastSectionIndex >= 0 ? lastSectionIndex + 1 : canonicalSeeds.length,
        0,
        plan.canonicalSeed as unknown as Record<string, unknown>,
      );
      registryChanged = true;
    }
  } else if (!same(canonicalSeeds[existingIndex], plan.canonicalSeed)) {
    if (!write) {
      drift.push(
        `${plan.canonicalSeed.id}: canonical registry seed differs from workflow.spec.json`,
      );
    } else {
      canonicalSeeds[existingIndex] =
        plan.canonicalSeed as unknown as Record<string, unknown>;
      registryChanged = true;
    }
  }

  for (const file of plan.files) {
    const target = join(repoRoot, file.path);
    const existing = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (existing === file.content) continue;

    if (!write) {
      drift.push(`${plan.canonicalSeed.id}: generated file drift at ${file.path}`);
      continue;
    }

    if (existing !== null && !isMaterializerOwnedFile(existing) && !adopt) {
      throw new Error(
        `Refusing to replace hand-authored file ${file.path}. Re-run with --adopt after reviewing the generated replacement.`,
      );
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
}

if (write && registryChanged) writeCanonicalRegistry();

if (!write && drift.length > 0) {
  console.error(
    [
      "Workflow materialization drift detected:",
      ...drift.map((item) => `- ${item}`),
      "Run pnpm workflow:materialize --write for new materializer-owned files.",
      "Use --adopt only when intentionally replacing reviewed hand-authored wrappers.",
    ].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    `${write ? "Materialized" : "Verified"} ${specPaths.length} workflow spec(s).`,
  );
  if (write && registryChanged) {
    console.log(
      "Canonical registry changed. Run pnpm registry:generate before committing.",
    );
  }
}
