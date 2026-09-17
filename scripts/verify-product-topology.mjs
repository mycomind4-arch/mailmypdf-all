import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const expectedVerticals = [
  "appeal-mail",
  "benefits-appeal",
  "claim-proof",
  "code-enforcement",
  "dispute-mail",
  "immigration-mail",
  "insurance-claims",
  "notice-respond",
  "permit-reply",
  "private-office",
  "records-request",
  "small-business",
  "tenant-reply",
].sort();

const verticalRoot = resolve(process.cwd(), "apps/verticals");
const entries = await readdir(verticalRoot, { withFileTypes: true });
const actualVerticals = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const missing = expectedVerticals.filter((name) => !actualVerticals.includes(name));
const unexpected = actualVerticals.filter((name) => !expectedVerticals.includes(name));

if (missing.length || unexpected.length) {
  console.error("MailMyPDF product topology drift detected.");
  if (missing.length) console.error(`Missing canonical verticals: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unexpected vertical directories: ${unexpected.join(", ")}`);
  process.exit(1);
}

console.log(`Product topology verified: ${actualVerticals.length} canonical verticals.`);
