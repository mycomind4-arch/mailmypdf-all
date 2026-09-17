import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  completedInsuranceAppealSteps,
  INSURANCE_APPEAL_EVIDENCE_KINDS,
  INSURANCE_APPEAL_STEPS,
  insuranceAppealStepLabel,
} from "../src/domain-packs/appeal/insurance-runtime.js";

describe("Insurance appeal runtime contract", () => {
  test("uses the canonical seven-step appeal sequence", () => {
    assert.deepEqual(INSURANCE_APPEAL_STEPS.map((step) => step.id), [
      "decision", "analysis", "facts", "evidence", "draft", "review", "mail",
    ]);
  });

  test("preserves the mature shared evidence taxonomy", () => {
    assert.deepEqual(INSURANCE_APPEAL_EVIDENCE_KINDS.map(([id]) => id), [
      "policy_or_plan",
      "claim_submission",
      "supporting_record",
      "receipt_or_invoice",
      "prior_correspondence",
      "expert_statement",
      "other",
    ]);
  });

  test("does not mark mail complete until both submission and proof exist", () => {
    const beforeProof = completedInsuranceAppealSteps({
      hasCleanDecision: true,
      hasAnalysis: true,
      hasFacts: true,
      hasEvidenceReview: true,
      hasDraft: true,
      hasApproval: true,
      hasMailingSubmission: true,
      hasProof: false,
    });
    assert.equal(beforeProof.includes("mail"), false);

    const complete = completedInsuranceAppealSteps({
      hasCleanDecision: true,
      hasAnalysis: true,
      hasFacts: true,
      hasEvidenceReview: true,
      hasDraft: true,
      hasApproval: true,
      hasMailingSubmission: true,
      hasProof: true,
    });
    assert.equal(complete.includes("mail"), true);
  });

  test("allows a workflow-specific primary document label without changing step identity", () => {
    assert.equal(insuranceAppealStepLabel("decision", "Prior authorization denial"), "Prior authorization denial");
    assert.equal(insuranceAppealStepLabel("analysis"), "Analysis");
  });
});
