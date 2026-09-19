import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const canonicalSections = [
  "appeal-mail",
  "benefits-appeal",
  "claim-proof",
  "code-enforcement",
  "dispute-mail",
  "immigration-mail",
  "insurance-claims",
  "legal-defense",
  "notice-respond",
  "permit-reply",
  "private-office",
  "records-request",
  "secured-transactions",
  "small-business",
  "tenant-reply",
].sort();

const activeWorkspaceSections = new Map([
  ["appeal-mail", "@mailmypdf/appeal-mail"],
  ["immigration-mail", "@mailmypdf/immigration-mail"],
  ["notice-respond", "@mailmypdf/notice-respond"],
  ["records-request", "@mailmypdf/records-request"],
  ["secured-transactions", "@mailmypdf/secured-transactions-section"],
]);

const root = process.cwd();
const rootEntries = await readdir(root, { withFileTypes: true });
const rootDirectories = new Set(
  rootEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
);

const missing = canonicalSections.filter((name) => !rootDirectories.has(name));
if (missing.length) {
  console.error("MailMyPDF canonical product topology drift detected.");
  console.error(`Missing canonical top-level sections: ${missing.join(", ")}`);
  process.exit(1);
}

for (const [section, expectedPackageName] of activeWorkspaceSections) {
  const packagePath = resolve(root, section, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(packagePath, "utf8"));
  } catch (error) {
    console.error(`Activated section ${section} is missing a readable package.json.`);
    console.error(error);
    process.exit(1);
  }
  if (manifest.name !== expectedPackageName) {
    console.error(
      `Activated section ${section} must use package name ${expectedPackageName}; found ${manifest.name ?? "(missing)"}.`,
    );
    process.exit(1);
  }
}

// Legacy donors are allowed during migration, but a new Secured Transactions
// implementation must never be created there.
const donorRoot = resolve(root, "apps/verticals");
let donorNames = [];
try {
  donorNames = (await readdir(donorRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
} catch {
  donorNames = [];
}

if (donorNames.includes("secured-transactions")) {
  console.error("apps/verticals/secured-transactions is forbidden: Secured Transactions is top-level only.");
  process.exit(1);
}

console.log(
  `Product topology verified: ${canonicalSections.length} canonical top-level sections; ${activeWorkspaceSections.size} activated workspace sections.`,
);
if (donorNames.length) {
  console.log(
    `Legacy donor/compatibility directories still present under apps/verticals: ${donorNames.join(", ")}.`,
  );
}
