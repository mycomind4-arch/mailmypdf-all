import { access, readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

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

console.log(`Product topology verified: ${actualSections.length} canonical root sections.`);
