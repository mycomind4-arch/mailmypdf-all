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

for (const legacyId of ["appeal-reply", "notice-response", "debt-defense", "small-business-mail"]) {
  if (expectedSections.includes(legacyId)) {
    console.error(`Legacy vertical id leaked into canonical section registry: ${legacyId}`);
    process.exit(1);
  }
}

console.log(`Product topology verified: ${actualSections.length} canonical root sections.`);
