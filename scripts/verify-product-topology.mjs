import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const CANONICAL_SECTIONS = [
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
  "small-business",
  "tenant-reply",
].sort();

async function directoryNames(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function reportDrift(label, expected, actual) {
  const missing = expected.filter((name) => !actual.includes(name));
  const unexpected = actual.filter((name) => !expected.includes(name));
  if (missing.length || unexpected.length) {
    console.error(`MailMyPDF ${label} topology drift detected.`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (unexpected.length) console.error(`  Unexpected: ${unexpected.join(", ")}`);
    return false;
  }
  console.log(`${label} topology verified: ${actual.length} directories.`);
  return true;
}

// The active architecture: each canonical section is a real top-level
// directory (e.g. appeal-mail/, notice-respond/), never apps/verticals/**.
// This is what the authenticated core's execution registry
// (packages/workflows/src/workflow-execution-registry.ts) actually points
// workflows at, and what this check treats as canonical going forward.
const topLevelActual = (
  await Promise.all(
    CANONICAL_SECTIONS.map(async (name) => {
      try {
        await readdir(resolve(process.cwd(), name));
        return name;
      } catch {
        return null;
      }
    }),
  )
).filter((name) => name !== null).sort();

const topLevelOk = reportDrift("top-level (active)", CANONICAL_SECTIONS, topLevelActual);

// apps/verticals/** remains a read-only donor/legacy tree during the
// migration -- still verified so it is never silently deleted or corrupted
// out from under in-progress donor-mining work, but it is not the
// architecture new work should target or route execution through.
const legacyActual = await directoryNames(resolve(process.cwd(), "apps/verticals"));
const legacyOk = reportDrift("apps/verticals (legacy donor)", CANONICAL_SECTIONS, legacyActual);

if (!topLevelOk || !legacyOk) {
  process.exit(1);
}
