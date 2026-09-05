import inventory from "../WORKFLOW_INVENTORY.json";
import { validateAuthorityCatalog } from "../src/lib/workflow-authority-gate";
import { SEO_WORKFLOW_CATALOG } from "../src/lib/workflow-seo-catalog";

type InventoryWorkflow = { id: string };

const modeledIds = new Set(((inventory.workflows ?? []) as InventoryWorkflow[]).map((workflow) => workflow.id));
const knownWorkflowIds = new Set([
  ...modeledIds,
  ...SEO_WORKFLOW_CATALOG.map((entry) => entry.id),
]);

const report = validateAuthorityCatalog(SEO_WORKFLOW_CATALOG, knownWorkflowIds);
const legacyDraftCount = [...modeledIds].filter(
  (id) => !SEO_WORKFLOW_CATALOG.some((entry) => entry.id === id),
).length;

console.log("MailMyPDF Workflow Authority Gate");
console.log("=================================");
console.log(`Known modeled workflow IDs: ${modeledIds.size}`);
console.log(`Master SEO catalog records: ${report.counts.total}`);
console.log(`Legacy modeled records remaining DRAFT/noindex: ${legacyDraftCount}`);
console.log(`SEO_READY: ${report.counts.seoReady}`);
console.log(`EXECUTABLE: ${report.counts.executable}`);
console.log(`Gate-qualified/indexable: ${report.counts.indexable}`);
console.log(`Build-blocking records: ${report.counts.blocked}`);

for (const result of report.results) {
  const status = result.state === "DRAFT"
    ? "DRAFT"
    : result.eligibleForIndexing
      ? "PASS"
      : "BLOCK";
  console.log(`\n[${status}] ${result.id} — ${result.score}/100 — ${result.substantiveWordCount} substantive words`);
  for (const gateIssue of result.issues) {
    const marker = gateIssue.severity === "error" ? "ERROR" : "WARN";
    console.log(`  ${marker} ${gateIssue.code}: ${gateIssue.message}`);
  }
}

if (report.counts.blocked > 0) {
  console.error("\nAuthority Gate failed. SEO_READY/EXECUTABLE records may not ship until every blocking issue is fixed.");
  process.exitCode = 1;
} else {
  console.log("\nAuthority Gate passed. DRAFT pages remain non-indexable by design.");
}
