import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { projectWorkflowInventory } from "../packages/workflows/src/canonical-workflow-registry";

const path = fileURLToPath(new URL("../mailmypdf/WORKFLOW_INVENTORY.json", import.meta.url));
const expected = JSON.stringify(projectWorkflowInventory(), null, 2) + "\n";
if (process.argv.includes("--write")) {
  writeFileSync(path, expected);
  console.log("Generated workflow inventory from canonical registry.");
} else if (readFileSync(path, "utf8") !== expected) {
  console.error("Workflow inventory drift. Run pnpm registry:generate and commit the projection.");
  process.exitCode = 1;
} else {
  console.log("Workflow inventory projection is current.");
}
