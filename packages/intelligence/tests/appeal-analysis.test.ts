import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createDecision,
  createEvidence,
  createGround,
  generateStrategy,
  runReadinessReview,
  runStressTest,
  runXRayAnalysis,
  updateFindingStatus,
} from "../src/appeal/index.js";

describe("Appeal analysis engine", () => {
  test("X-Ray identifies cross-document date conflicts with provenance", () => {
    const decision = createDecision("claim_denial", {
      agency: "Example Insurer",
      referenceNumber: "CLM-100",
      decisionDate: "2026-01-10",
      reasons: [{ id: "reason-1", text: "The requested service was not timely submitted for review.", confidence: 1 }],
      deadline: { type: "appeal", source: "extracted", date: "2099-12-31" },
    });

    const result = runXRayAnalysis([
      { id: "decision-doc", name: "denial.pdf", pageCount: 2, isDecision: true, text: "The claim was submitted January 1, 2026. The requested service was not timely submitted for review." },
      { id: "receipt-doc", name: "receipt.pdf", pageCount: 1, isDecision: false, text: "Portal receipt: claim submitted January 3, 2026." },
    ], decision);

    const conflict = result.findings.find((finding) => finding.type === "date_conflict");
    assert.ok(conflict);
    assert.equal(conflict.confidence, "high");
    assert.equal(conflict.sources.length, 2);
  });

  test("stress test and strategy prioritize supported grounds without inventing evidence", () => {
    const decision = createDecision("claim_denial", {
      agency: "Example Insurer",
      referenceNumber: "CLM-101",
      decisionDate: "2026-01-10",
      deadline: { type: "appeal", source: "extracted", date: "2099-12-31" },
      appealInstructions: "Mail the appeal to the Appeals Department.",
    });
    const ground = createGround("factual_error", {
      id: "ground-1",
      claim: "The decision uses the wrong submission date for the claim.",
      source: "denial.pdf, page 1",
      confidence: 0.9,
      draftLanguage: "Please reverse the denial based on the documented submission date.",
    });
    const evidence = createEvidence("document", "Portal receipt", {
      id: "evidence-1",
      documentId: "receipt-doc",
      documentFilename: "receipt.pdf",
      groundIds: [ground.id],
    });
    const xray = runXRayAnalysis([
      { id: "decision-doc", name: "denial.pdf", pageCount: 1, isDecision: true, text: "The claim was submitted January 1, 2026." },
      { id: "receipt-doc", name: "receipt.pdf", pageCount: 1, isDecision: false, text: "The claim was submitted January 3, 2026." },
    ], decision, [evidence]);
    const conflict = xray.findings.find((finding) => finding.type === "date_conflict");
    const reviewed = conflict ? updateFindingStatus(xray, conflict.id, "used_in_appeal") : xray;
    const stress = runStressTest([ground], [evidence], "I request that the insurer reverse the denial. See Exhibit A for the portal receipt documenting the submission date.", reviewed);
    const strategy = generateStrategy(decision, [ground], [evidence], reviewed.findings, stress);

    assert.equal(stress.summary.totalArguments, 1);
    assert.ok(stress.summary.overallScore > 0);
    assert.equal(strategy.grounds[0].hasGaps, false);
    assert.equal(strategy.grounds[0].evidenceCount, 1);
  });

  test("readiness review converts X-Ray conflicts into review warnings and preserves hard blockers", () => {
    const decision = createDecision("claim_denial", {
      agency: "Example Insurer",
      referenceNumber: "CLM-102",
      decisionDate: "2026-01-10",
      deadline: { type: "appeal", source: "extracted", date: "2099-12-31" },
      appealInstructions: "Mail the appeal and supporting exhibits to the Appeals Department.",
    });
    const ground = createGround("factual_error", {
      id: "ground-2",
      claim: "The decision states an incorrect submission date that is contradicted by the portal receipt.",
      source: "denial.pdf, page 1",
      confidence: 0.9,
      draftLanguage: "Please reverse the denial based on the correct submission date.",
    });
    const evidence = createEvidence("document", "Portal receipt", { id: "evidence-2", groundIds: [ground.id] });
    const xray = runXRayAnalysis([
      { id: "decision-doc", name: "denial.pdf", pageCount: 1, isDecision: true, text: "The claim was submitted January 1, 2026." },
      { id: "receipt-doc", name: "receipt.pdf", pageCount: 1, isDecision: false, text: "The claim was submitted January 3, 2026." },
    ], decision, [evidence]);

    const review = runReadinessReview({
      decision,
      grounds: [ground],
      evidence: [evidence],
      draft: "I request that the denial be reversed. The portal receipt is enclosed as Exhibit A and documents the submission date.",
      recipient: { name: "Appeals Department", address1: "1 Main St", city: "Example", state: "CA", zip: "95501" },
      exhibitCount: 1,
      hasSignature: true,
      xrayResult: xray,
    });

    assert.deepEqual(review.blockers, []);
    assert.equal(review.checks.find((item) => item.id === "inconsistent_dates")?.status, "warning");
    assert.ok(review.score < 100);
  });
});
