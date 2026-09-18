import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscrepancyReport,
  createDiscrepancy,
  discrepanciesByType,
  reviewDiscrepancy,
  unresolvedDiscrepancies,
} from "../src/index.js";

test("generic discrepancy preserves provenance and requires review for high-consequence issues", () => {
  const discrepancy = createDiscrepancy({
    id: "disc-1",
    discrepancyType: "owner_mismatch",
    severity: "high",
    rationale: "Named recipient differs from the current record.",
    evidenceRefs: ["fact-recipient", "fact-owner"],
    involvesHighConsequence: true,
    provenance: { level: "rule_derived", ruleId: "owner-compare-v1" },
    confidence: 0.88,
  });

  assert.equal(discrepancy.reviewState, "pending");
  assert.equal(discrepancy.verified, false);
  assert.deepEqual(discrepancy.evidenceRefs, ["fact-recipient", "fact-owner"]);

  const report = buildDiscrepancyReport([discrepancy]);
  assert.equal(report.highSeverityCount, 1);
  assert.equal(report.blockingCount, 1);
  assert.equal(report.requiresHumanReview, true);
});

test("resolved discrepancy becomes human verified without deleting its original evidence", () => {
  const discrepancy = createDiscrepancy({
    id: "disc-1",
    discrepancyType: "date_mismatch",
    severity: "medium",
    rationale: "Two source dates differ.",
    evidenceRefs: ["fact-a", "fact-b"],
    provenance: { level: "document_extracted" },
  });

  const resolved = reviewDiscrepancy(discrepancy, {
    reviewedBy: "reviewer-1",
    state: "resolved",
    note: "Second source supersedes the first.",
    reviewedAt: "2026-09-18T12:00:00Z",
  });

  assert.equal(resolved.reviewState, "resolved");
  assert.equal(resolved.verified, true);
  assert.equal(resolved.provenance.level, "human_verified");
  assert.deepEqual(resolved.evidenceRefs, discrepancy.evidenceRefs);
  assert.equal(unresolvedDiscrepancies([resolved]).length, 0);
});

test("discrepancy reports and queries remain domain neutral", () => {
  const owner = createDiscrepancy({
    id: "disc-owner",
    discrepancyType: "owner_mismatch",
    severity: "high",
    rationale: "Owner differs.",
    provenance: { level: "rule_derived", ruleId: "owner-v1" },
  });
  const deadline = createDiscrepancy({
    id: "disc-deadline",
    discrepancyType: "deadline_mismatch",
    severity: "low",
    rationale: "Dates differ.",
    provenance: { level: "ai_inferred", modelId: "test-model" },
  });

  assert.equal(discrepanciesByType([owner, deadline], "owner_mismatch").length, 1);
  const report = buildDiscrepancyReport([owner, deadline]);
  assert.equal(report.highSeverityCount, 1);
  assert.equal(report.lowSeverityCount, 1);
});
