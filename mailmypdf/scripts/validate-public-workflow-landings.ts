import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type LandingConfig = {
  id: string;
  sectionId: string;
  path: string;
  startPath: string;
  title: string;
  heroTitle: string;
  heroDescription: string;
  indexable: boolean;
  contentStatus: "scaffold" | "reviewed" | "published";
  whatYouDo?: readonly string[];
  whatYouNeed?: readonly string[];
  outputs?: readonly string[];
  faqs?: readonly (readonly [string, string])[];
  workspaceHighlights?: readonly (readonly [string, string])[];
  workflowSteps?: readonly (readonly [string, string])[];
  readyItems?: readonly (readonly [string, string])[];
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const routesRoot = path.join(repoRoot, "mailmypdf/src/routes");

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
}

function minItems(
  config: LandingConfig,
  key: keyof Pick<LandingConfig, "whatYouDo" | "whatYouNeed" | "outputs" | "faqs" | "workspaceHighlights" | "workflowSteps" | "readyItems">,
  minimum: number,
  errors: string[],
) {
  const value = config[key] as readonly unknown[] | undefined;
  if (!value || value.length < minimum) {
    errors.push(`${config.id}: indexable landing requires ${key} with at least ${minimum} item(s).`);
  }
}

const routeFiles = (await walk(routesRoot))
  .filter((file) => /\/workflows\/[^/]+\/index\.tsx$/.test(file))
  .sort();

const failures: string[] = [];
let mounted = 0;
let indexable = 0;
let scaffold = 0;

for (const routeFile of routeFiles) {
  const relative = path.relative(routesRoot, routeFile).split(path.sep);
  if (relative.length !== 4 || relative[1] !== "workflows" || relative[3] !== "index.tsx") continue;

  const [sectionId, , workflowId] = relative;
  mounted += 1;

  const configPath = path.join(repoRoot, sectionId, "workflows", workflowId, "config.ts");
  try {
    await access(configPath);
  } catch {
    failures.push(`${sectionId}/${workflowId}: mounted public route has no canonical config.ts.`);
    continue;
  }

  const imported = await import(pathToFileURL(configPath).href);
  const config = (imported.workflowConfig ?? imported.default) as LandingConfig | undefined;
  if (!config) {
    failures.push(`${sectionId}/${workflowId}: config.ts does not export workflowConfig/default.`);
    continue;
  }

  const expectedPath = `/${sectionId}/workflows/${workflowId}`;
  if (config.path !== expectedPath) {
    failures.push(`${config.id}: path '${config.path}' does not match mounted route '${expectedPath}'.`);
  }
  if (config.startPath !== `${expectedPath}/start`) {
    failures.push(`${config.id}: startPath '${config.startPath}' does not match '${expectedPath}/start'.`);
  }

  if (config.contentStatus === "scaffold") scaffold += 1;
  if (config.contentStatus === "scaffold" && config.indexable) {
    failures.push(`${config.id}: scaffold content may never be indexable.`);
  }

  if (!config.indexable) continue;
  indexable += 1;

  if (config.contentStatus !== "reviewed" && config.contentStatus !== "published") {
    failures.push(`${config.id}: indexable page must be reviewed or published, not ${config.contentStatus}.`);
  }
  if ((config.heroTitle ?? "").trim().length < 12) {
    failures.push(`${config.id}: heroTitle is too thin for an indexable public page.`);
  }
  if ((config.heroDescription ?? "").trim().length < 100) {
    failures.push(`${config.id}: heroDescription must clearly explain the workflow (100+ characters).`);
  }
  if (/use a guided .* workflow built around/i.test(config.heroDescription ?? "")) {
    failures.push(`${config.id}: generic scaffold hero copy may not be indexable.`);
  }

  minItems(config, "whatYouDo", 3, failures);
  minItems(config, "whatYouNeed", 3, failures);
  minItems(config, "outputs", 3, failures);
  minItems(config, "workspaceHighlights", 3, failures);
  minItems(config, "workflowSteps", 4, failures);
  minItems(config, "readyItems", 3, failures);
  minItems(config, "faqs", 3, failures);
}

console.log("MailMyPDF Public Workflow Landing Gate");
console.log("======================================");
console.log(`Mounted public workflow routes: ${mounted}`);
console.log(`Indexable public workflow routes: ${indexable}`);
console.log(`Mounted scaffold/noindex routes: ${scaffold}`);

if (failures.length) {
  console.error(`\nBlocking issues: ${failures.length}`);
  for (const failure of failures) console.error(`  ERROR ${failure}`);
  console.error("\nPublic landing gate failed. Thin, generic, or structurally incomplete pages may not be indexable.");
  process.exit(1);
}

console.log("\nPublic landing gate passed. Every indexable mounted workflow has the required public-page substance.");
