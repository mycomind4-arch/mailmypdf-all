import inventory from "../WORKFLOW_INVENTORY.json";
import { validateAuthorityCatalog } from "../src/lib/workflow-authority-gate";
import { SEO_WORKFLOW_CANDIDATES } from "../src/lib/workflow-seo-candidates";
import { SEO_WORKFLOW_CATALOG } from "../src/lib/workflow-seo-catalog";
import { validateWorkflowSeoTopology } from "../src/lib/workflow-seo-topology";

type InventoryWorkflow = { id: string; route: string };

/**
 * `--json` emits the report machine-readably and `--id <workflowId>` narrows
 * the printed results to one workflow. Both exist for Studio's SEO agent,
 * which needs a verdict for the single workflow a run is building.
 *
 * Validation always runs over the whole catalog regardless of `--id`: the
 * duplicate-metadata and content-similarity checks are cross-record by
 * definition, so scoring one entry in isolation would silently skip exactly
 * the checks that catch mass-generated near-duplicate pages.
 */
const args = process.argv.slice(2);
const asJson = args.includes("--json");
function flagValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
const onlyId = flagValue("--id");
// Studio's SEO agent knows a run's public path, not its catalog id, so a
// route lookup avoids making every caller reverse-engineer the id scheme.
const onlyRoute = flagValue("--route");

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

if (onlyId || onlyRoute) {
  const normalizedRoute = onlyRoute ? `/${onlyRoute.trim().replace(/^\/+|\/+$/g, "")}` : undefined;
  const entry = SEO_WORKFLOW_CATALOG.find((candidate) =>
    onlyId ? candidate.id === onlyId : `/${candidate.route.replace(/^\/+|\/+$/g, "")}` === normalizedRoute,
  );
  const target = entry ? report.results.find((result) => result.id === entry.id) : undefined;
  if (!target || !entry) {
    const payload = { ok: false, error: `Workflow '${onlyId ?? onlyRoute}' is not present in the SEO catalog.` };
    console.log(asJson ? JSON.stringify(payload) : payload.error);
    process.exit(1);
  }
  const ok = target.state !== "DRAFT" && target.eligibleForIndexing;
  if (asJson) {
    // Source URLs travel with the verdict so the caller can check that cited
    // authority actually resolves — the gate only validates URL shape, which
    // is exactly the gap that lets generated content cite pages that 404.
    const sources = (entry.content?.sources ?? []).map((source) => ({
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      kind: source.kind,
    }));
    console.log(JSON.stringify({ ok, result: target, sources, topologyIssues, candidateIssues }));
  } else {
    console.log(`[${ok ? "PASS" : target.state === "DRAFT" ? "DRAFT" : "BLOCK"}] ${target.id} — ${target.score}/100 — ${target.substantiveWordCount} substantive words`);
    for (const gateIssue of target.issues) {
      console.log(`  ${gateIssue.severity === "error" ? "ERROR" : "WARN"} ${gateIssue.code}: ${gateIssue.message}`);
    }
  }
  process.exit(ok ? 0 : 1);
}

if (asJson) {
  console.log(JSON.stringify({
    ok: report.counts.blocked === 0 && topologyIssues.length === 0 && candidateIssues.length === 0,
    counts: report.counts,
    results: report.results,
    topologyIssues,
    candidateIssues,
  }));
  process.exit(report.counts.blocked === 0 && topologyIssues.length === 0 && candidateIssues.length === 0 ? 0 : 1);
}

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
