import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { sitemapRoutes } from "../src/lib/sitemap";

type ParsedConfig = {
  id?: string;
  sectionId?: string;
  path?: string;
  startPath?: string;
  title?: string;
  heroTitle?: string;
  heroDescription?: string;
  indexable?: boolean;
  contentStatus?: string;
  counts: Record<string, number>;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const routesRoot = path.join(repoRoot, "mailmypdf/src/routes");
const countedFields = new Set([
  "whatYouDo",
  "whatYouNeed",
  "outputs",
  "faqs",
  "workspaceHighlights",
  "workflowSteps",
  "readyItems",
]);

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
}

function propertyName(node: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
}

function literalString(node: ts.Expression): string | undefined {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
}

function literalBoolean(node: ts.Expression): boolean | undefined {
  return node.kind === ts.SyntaxKind.TrueKeyword ? true : node.kind === ts.SyntaxKind.FalseKeyword ? false : undefined;
}

function parseConfig(sourcePath: string, source: string): ParsedConfig {
  const file = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let object: ts.ObjectLiteralExpression | undefined;

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "workflowConfig" || !declaration.initializer) continue;
      let initializer: ts.Expression = declaration.initializer;
      if (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)) initializer = initializer.expression;
      if (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)) initializer = initializer.expression;
      if (ts.isObjectLiteralExpression(initializer)) object = initializer;
    }
  }

  if (!object) throw new Error("workflowConfig object literal not found");

  const result: ParsedConfig = { counts: {} };
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property.name);
    if (!name) continue;

    if (countedFields.has(name)) {
      result.counts[name] = ts.isArrayLiteralExpression(property.initializer)
        ? property.initializer.elements.length
        : 0;
      continue;
    }

    if (name === "indexable") {
      result.indexable = literalBoolean(property.initializer);
      continue;
    }

    if (["id", "sectionId", "path", "startPath", "title", "heroTitle", "heroDescription", "contentStatus"].includes(name)) {
      (result as Record<string, unknown>)[name] = literalString(property.initializer);
    }
  }
  return result;
}

function minItems(config: ParsedConfig, id: string, key: string, minimum: number, errors: string[]) {
  const count = config.counts[key] ?? 0;
  if (count < minimum) errors.push(`${id}: indexable landing requires ${key} with at least ${minimum} item(s); found ${count}.`);
}

const routeFiles = (await walk(routesRoot))
  .filter((file) => /\/workflows\/[^/]+\/index\.tsx$/.test(file))
  .sort();

const failures: string[] = [];
const sitemapPaths = new Set(sitemapRoutes().map((route) => route.loc));
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

  let config: ParsedConfig;
  try {
    config = parseConfig(configPath, await readFile(configPath, "utf8"));
  } catch (error) {
    failures.push(`${sectionId}/${workflowId}: could not statically parse config.ts (${error instanceof Error ? error.message : String(error)}).`);
    continue;
  }

  const id = config.id ?? `${sectionId}/${workflowId}`;
  const expectedPath = `/${sectionId}/workflows/${workflowId}`;
  if (config.path !== expectedPath) failures.push(`${id}: path '${config.path ?? "missing"}' does not match mounted route '${expectedPath}'.`);
  if (config.startPath !== `${expectedPath}/start`) failures.push(`${id}: startPath '${config.startPath ?? "missing"}' does not match '${expectedPath}/start'.`);

  if (config.contentStatus === "scaffold") scaffold += 1;
  if (config.contentStatus === "scaffold" && config.indexable === true) failures.push(`${id}: scaffold content may never be indexable.`);

  if (config.indexable !== true) continue;
  indexable += 1;

  if (!sitemapPaths.has(expectedPath)) {
    failures.push(`${id}: indexable mounted workflow is missing from sitemapRoutes().`);
  }

  if (config.contentStatus !== "reviewed" && config.contentStatus !== "published") {
    failures.push(`${id}: indexable page must be reviewed or published, not ${config.contentStatus ?? "missing"}.`);
  }
  if ((config.heroTitle ?? "").trim().length < 12) failures.push(`${id}: heroTitle is too thin for an indexable public page.`);
  if ((config.heroDescription ?? "").trim().length < 100) failures.push(`${id}: heroDescription must clearly explain the workflow (100+ characters).`);
  if (/use a guided .* workflow built around/i.test(config.heroDescription ?? "")) failures.push(`${id}: generic scaffold hero copy may not be indexable.`);

  minItems(config, id, "whatYouDo", 3, failures);
  minItems(config, id, "whatYouNeed", 3, failures);
  minItems(config, id, "outputs", 3, failures);
  minItems(config, id, "workspaceHighlights", 3, failures);
  minItems(config, id, "workflowSteps", 4, failures);
  minItems(config, id, "readyItems", 3, failures);
  minItems(config, id, "faqs", 3, failures);
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
