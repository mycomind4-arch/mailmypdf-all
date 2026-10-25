import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { workflowRegistryTopologyIssues } from "./workflow-registry-topology.mjs";

const repoRoot = process.cwd();
const registryPath = resolve(repoRoot, "mailmypdf/src/lib/section-registry.ts");
const registrySource = await readFile(registryPath, "utf8");

const expectedSections = [
  ...registrySource.matchAll(/^\s{4}id: "([^"]+)",$/gm),
].map((match) => match[1]).sort();

if (expectedSections.length !== 15) {
  console.error(`Canonical section registry must contain 15 sections; found ${expectedSections.length}.`);
  process.exit(1);
}

const requiredEntries = ["config.ts", "index.tsx", "workflows"];

async function isSectionDirectory(name) {
  try {
    await Promise.all(requiredEntries.map((entry) => access(resolve(repoRoot, name, entry))));
    return true;
  } catch {
    return false;
  }
}

const rootEntries = await readdir(repoRoot, { withFileTypes: true });
const candidateDirectories = rootEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const actualSections = [];
for (const name of candidateDirectories) {
  if (await isSectionDirectory(name)) actualSections.push(name);
}
actualSections.sort();

const missing = expectedSections.filter((name) => !actualSections.includes(name));
const unexpected = actualSections.filter((name) => !expectedSections.includes(name));

if (missing.length || unexpected.length) {
  console.error("MailMyPDF section topology drift detected.");
  if (missing.length) console.error(`Missing canonical root sections: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unexpected root section directories: ${unexpected.join(", ")}`);
  process.exit(1);
}

// If a canonical section is activated as a workspace package, its manifest
// must identify that very section. Unpackaged section roots are valid: their
// routes are mounted by the one canonical TanStack host instead.
const activePackageNames = new Set();
for (const section of expectedSections) {
  const packagePath = resolve(repoRoot, section, "package.json");
  let manifestText;
  try {
    manifestText = await readFile(packagePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    console.error(`Activated section ${section} has an invalid package.json.`);
    process.exit(1);
  }

  const expectedNames = [`@mailmypdf/${section}`, `@mailmypdf/${section}-section`];
  if (!expectedNames.includes(manifest?.name)) {
    console.error(
      `Activated section ${section} has invalid workspace package name ${manifest?.name ?? "(missing)"}; expected ${expectedNames.join(" or ")}.`,
    );
    process.exit(1);
  }
  if (activePackageNames.has(manifest.name)) {
    console.error(`Duplicate canonical section workspace package: ${manifest.name}.`);
    process.exit(1);
  }
  activePackageNames.add(manifest.name);
}

// The historical apps/verticals donor tree may contain compatibility packages,
// but Secured Transactions is native to the top level and must not be copied
// back under the deprecated application-shell layout.
let duplicateLegacySecuredTransactions = false;
try {
  await access(resolve(repoRoot, "apps", "verticals", "secured-transactions"));
  duplicateLegacySecuredTransactions = true;
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
if (duplicateLegacySecuredTransactions) {
  console.error("Secured Transactions must not be implemented under apps/verticals/secured-transactions.");
  process.exit(1);
}

// Every canonical root section must also be mounted into the live TanStack app.
// A root package that is not reachable from mailmypdf/src/routes is not a
// deployed section, even if its source tree is otherwise complete.
const appRoutesRoot = resolve(repoRoot, "mailmypdf", "src", "routes");
const missingRouteMounts = [];
const invalidRouteMounts = [];

for (const section of expectedSections) {
  const routePath = resolve(appRoutesRoot, section, "index.tsx");
  try {
    const source = await readFile(routePath, "utf8");
    if (!source.includes("SectionLandingPage") || !source.includes(`../../../../${section}/config`)) {
      invalidRouteMounts.push(section);
    }
  } catch {
    missingRouteMounts.push(section);
  }
}

if (missingRouteMounts.length || invalidRouteMounts.length) {
  console.error("Canonical section route-mount drift detected.");
  if (missingRouteMounts.length) console.error(`Missing live section mounts: ${missingRouteMounts.join(", ")}`);
  if (invalidRouteMounts.length) console.error(`Section mounts not using canonical root config: ${invalidRouteMounts.join(", ")}`);
  process.exit(1);
}

// Records Request used to be a standalone executable page at the section root.
// The executable flow now belongs under a workflow /start route.
try {
  await access(resolve(appRoutesRoot, "records-request.tsx"));
  console.error("Legacy flat /records-request executable route still exists.");
  process.exit(1);
} catch {
  // expected: canonical mount is src/routes/records-request/index.tsx
}

// Secured Transactions must expose its registered workflow directory in the
// live app; this was previously the gap between its domain package and UI.
try {
  await access(resolve(appRoutesRoot, "secured-transactions", "workflows", "index.tsx"));
} catch {
  console.error("Secured Transactions workflow directory is not mounted in the live app.");
  process.exit(1);
}

for (const legacyId of ["appeal-reply", "notice-response", "debt-defense", "small-business-mail"]) {
  if (expectedSections.includes(legacyId)) {
    console.error(`Legacy vertical id leaked into canonical section registry: ${legacyId}`);
    process.exit(1);
  }
}

const workflowIssues = workflowRegistryTopologyIssues(repoRoot, expectedSections);
if (workflowIssues.length) {
  console.error("Canonical workflow topology drift detected:\n" + workflowIssues.join("\n"));
  process.exit(1);
}
console.log(`Product topology verified: ${actualSections.length} canonical root sections and their registered workflows.`);
