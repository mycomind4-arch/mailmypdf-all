import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const assets = [
  ["appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-561-u2.pdf", "apps/mailmypdf/public/workflow-assets/appeal-ssdi-denial/ssa-561-u2.pdf"],
  ["appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-3441.pdf", "apps/mailmypdf/public/workflow-assets/appeal-ssdi-denial/ssa-3441.pdf"],
  ["appeal-mail/workflows/appeal-ssdi-denial/forms/generated/ssa-827.pdf", "apps/mailmypdf/public/workflow-assets/appeal-ssdi-denial/ssa-827.pdf"],
];

for (const [source, destination] of assets) {
  const from = join(repoRoot, source);
  const to = join(repoRoot, destination);
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}

console.log(`Prepared ${assets.length} workflow asset(s).`);
