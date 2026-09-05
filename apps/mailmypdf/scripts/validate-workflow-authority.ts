import inventory from "../WORKFLOW_INVENTORY.json";
import { validateAuthorityCatalog } from "../src/lib/workflow-authority-gate";
import { SEO_WORKFLOW_CANDIDATES } from "../src/lib/workflow-seo-candidates";
import { SEO_WORKFLOW_CATALOG } from "../src/lib/workflow-seo-catalog";
import { validateWorkflowSeoTopology } from "../src/lib/workflow-seo-topology";

type InventoryWorkflow = { id: string; route: string };

const modeled = (inventory.workflows ?? []) as InventoryWorkflow[];
const modeledIds = new Set(modeled.map((workflow) => workflow.id));
const knownWorkflowIds = new Set([
  ...modeledIds,
  ...SEO_WORKFLOW_CATALOG.map((entry) => entry.id),
]);

const topologyIssues = validateWorkflowSeoTopology(SEO_WORKFLOW_CATALOG, modeled);
const report = validateAuthorityCatalog(SEO_WORKFLOW_CATALOG, knownWorkflowIds);
const draftCount = SEO_WORKFLOW_CATALOG.filter((entry) => entry.state === "DRAFT").length;
const needsIndividualReviewCount = SEO_WORKFLOW_CATALOG.filter(
  (entry) => entry.reviewStatus !== "AUTHORITY_REVIEWED",
).length;

const candidateKeys = new Set<string>();
const candidateIssues: string[] = [];
for (const candidate of SEO_WORKFLOW_CANDIDATES) {
  if (candidateKeys.has(candidate.candidateKey)) {
    candidateIssues.push(`Duplicate review-only candidate key '${candidate.candidateKey}'.`);
  }
  candidateKeys.add(candidate.candidateKey);
  if (candidate.reviewStatus !== "NEEDS_INDIVIDUAL_REVIEW") {
    candidateIssues.push(`Candidate '${candidate.candidateKey}' must remain NEEDS_INDIVIDUAL_REVIEW until deliberately promoted.`);
  }
  if (!candidate.sourcePath.startsWith("build-specs/")) {
    candidateIssues.push(`Candidate '${candidate.candidateKey}' has non-spec extraction provenance '${candidate.sourcePath}'.`);
  }
}

const unresolvedCandidates = SEO_WORKFLOW_CANDIDATES.filter(
  (candidate) => candidate.normalizationStatus !== "MODELED_REFERENCE_CONFIRMED",
).length;

console.log("MailMyPDF Workflow Authority Gate");
console.log("=================================");
console.log(`Known modeled workflow IDs: ${modeledIds.size}`);
console.log(`Master SEO catalog records: ${report.counts.total}`);
console.log(`DRAFT/noindex catalog records: ${draftCount}`);
console.log(`Catalog records needing individual review: ${needsIndividualReviewCount}`);
console.log(`Spec-derived review-only candidates: ${SEO_WORKFLOW_CANDIDATES.length}`);
console.log(`Candidates still needing canonical normalization: ${unresolvedCandidates}`);
console.log(`SEO_READY: ${report.counts.seoReady}`);
console.log(`EXECUTABLE: ${report.counts.executable}`);
console.log(`Gate-qualified/indexable: ${report.counts.indexable}`);
console.log(`Build-blocking authority records: ${report.counts.blocked}`);
console.log(`Catalog topology issues: ${topologyIssues.length}`);
console.log(`Candidate registry issues: ${candidateIssues.length}`);

if (topologyIssues.length) {
  console.log("\nCatalog topology failures:");
  for (const topologyIssue of topologyIssues) {
    console.log(`  ERROR ${topologyIssue.code}: ${topologyIssue.message}`);
  }
}

if (candidateIssues.length) {
  console.log("\nCandidate extraction failures:");
  for (const candidateIssue of candidateIssues) {
    console.log(`  ERROR ${candidateIssue}`);
  }
}

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

if (report.counts.blocked > 0 || topologyIssues.length > 0 || candidateIssues.length > 0) {
  console.error("\nAuthority Gate failed. Thin content, missing individual review, unverified execution, duplicate/colliding routes, or invalid extraction topology may not ship.");
  process.exitCode = 1;
} else {
  console.log("\nAuthority Gate passed. DRAFT catalog records and review-only spec candidates remain non-indexable by design.");
}
