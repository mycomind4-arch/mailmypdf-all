/* ═══════════════════════════════════════════════════════════
   DISPUTE-MAIL PIPELINE ENFORCEMENT TESTS

   Proves the Gold Standard pipeline enforces all stages:
   - Intelligence: security → classification → extraction → findings → evidence → strategy → blocking → draft → validation
   - Consequential: review → approval → submission → proof

   All gates fail closed. No stage is silently skipped.
   ═══════════════════════════════════════════════════════════ */

import { test, expect } from "vitest";
import { runDisputePipeline } from "../src/domain/pipeline.ts";

// ── Fixtures ─────────────────────────────────────────────────

const VALID_INPUT = {
  workflowId: "credit-report",
  documentId: "doc-1",
  text: "TransUnion credit report dated 2026-08-01 shows Account 12345 with a balance of $5,000.",
  bureau: "TransUnion",
  accountNumber: "12345",
  reportDate: "2026-08-01",
  errorType: "Not my account",
  facts: "I do not recognize account 12345. This account does not belong to me.",
  objective: "Remove the account after investigation.",
};

const FULL_CONSEQUENTIAL = {
  draftValidated: true,
  humanApproved: true,
  recipientComplete: true,
  paymentComplete: true,
  mailingSubmitted: true,
  trackingNumber: "USPS-TRACK-12345",
  proofReady: true,
};

// ── Intelligence pipeline tests ──

test("pipeline runs all intelligence stages for valid input", () => {
  const result = runDisputePipeline(VALID_INPUT);
  const stageNames = result.stages.map(s => s.stage);
  expect(stageNames.includes("security")).toBe(true);
  expect(stageNames.includes("classification")).toBe(true);
  expect(stageNames.includes("extraction")).toBe(true);
  expect(stageNames.includes("findings")).toBe(true);
  expect(stageNames.includes("evidence")).toBe(true);
  expect(stageNames.includes("strategy")).toBe(true);
  expect(stageNames.includes("blocking")).toBe(true);
  expect(stageNames.includes("draft")).toBe(true);
  expect(stageNames.includes("draftProvenance")).toBe(true);
  expect(stageNames.includes("validation")).toBe(true);
});

test("pipeline generates a draft with FCRA reference", () => {
  const result = runDisputePipeline(VALID_INPUT);
  expect(result.draft.length).toBeGreaterThan(100);
  expect(result.draft.includes("FCRA")).toBe(true);
  expect(result.draft.includes("TransUnion")).toBe(true);
});

test("pipeline blocks when source text is empty", () => {
  const result = runDisputePipeline({ ...VALID_INPUT, text: "" });
  expect(result.blocked).toBe(true);
  expect(result.errors.some(e => e.includes("blocking"))).toBe(true);
  const blocking = result.stages.find(s => s.stage === "blocking");
  expect(blocking.status).toBe("failed");
  const review = result.stages.find(s => s.stage === "reviewBoundary");
  expect(review.status).toBe("blocked");
});

test("pipeline blocks when facts are missing", () => {
  const result = runDisputePipeline({ ...VALID_INPUT, facts: "" });
  expect(result.blocked).toBe(true);
});

test("pipeline blocks when objective is missing", () => {
  const result = runDisputePipeline({ ...VALID_INPUT, objective: "" });
  expect(result.blocked).toBe(true);
});

// ── Consequential enforcement tests ──

test("consequential stages are SKIPPED when no consequential state provided", () => {
  const result = runDisputePipeline(VALID_INPUT, null);
  const review = result.stages.find(s => s.stage === "reviewBoundary");
  expect(review.status).toBe("skipped");
  const approval = result.stages.find(s => s.stage === "approvalBoundary");
  expect(approval.status).toBe("skipped");
});

test("reviewBoundary FAILS when evidence is unresolved", () => {
  const result = runDisputePipeline(
    { ...VALID_INPUT, text: "", facts: "" },
    FULL_CONSEQUENTIAL,
  );
  const review = result.stages.find(s => s.stage === "reviewBoundary");
  expect(["blocked", "failed"]).toContain(review.status);
});

test("approvalBoundary FAILS when human approval missing", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    humanApproved: false,
  });
  const approval = result.stages.find(s => s.stage === "approvalBoundary");
  expect(approval.status).toBe("failed");
  expect(approval.error).toContain("approval");
});

test("submissionBoundary FAILS when payment missing", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    paymentComplete: false,
  });
  const submission = result.stages.find(s => s.stage === "submissionBoundary");
  expect(submission.status).toBe("failed");
});

test("submissionBoundary FAILS when mailing not submitted", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    mailingSubmitted: false,
  });
  const submission = result.stages.find(s => s.stage === "submissionBoundary");
  expect(submission.status).toBe("failed");
});

test("submissionBoundary FAILS when recipient incomplete", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    recipientComplete: false,
  });
  const submission = result.stages.find(s => s.stage === "submissionBoundary");
  expect(submission.status).toBe("failed");
});

test("proofTrackingBoundary FAILS when tracking number missing", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    trackingNumber: null,
  });
  const proof = result.stages.find(s => s.stage === "proofTrackingBoundary");
  expect(proof.status).toBe("failed");
});

test("proofTrackingBoundary FAILS when proof not verified", () => {
  const result = runDisputePipeline(VALID_INPUT, {
    ...FULL_CONSEQUENTIAL,
    proofReady: false,
  });
  const proof = result.stages.find(s => s.stage === "proofTrackingBoundary");
  expect(proof.status).toBe("failed");
});

test("all consequential stages PASS with full Gold state", () => {
  const result = runDisputePipeline(VALID_INPUT, FULL_CONSEQUENTIAL);
  const review = result.stages.find(s => s.stage === "reviewBoundary");
  const approval = result.stages.find(s => s.stage === "approvalBoundary");
  const submission = result.stages.find(s => s.stage === "submissionBoundary");
  const proof = result.stages.find(s => s.stage === "proofTrackingBoundary");
  expect(review.status).toBe("passed");
  expect(approval.status).toBe("passed");
  expect(submission.status).toBe("passed");
  expect(proof.status).toBe("passed");
  expect(result.ready).toBe(true);
  expect(result.blocked).toBe(false);
});

test("pipeline ready is false when any consequential gate fails", () => {
  const failingStates = [
    { ...FULL_CONSEQUENTIAL, humanApproved: false },
    { ...FULL_CONSEQUENTIAL, paymentComplete: false },
    { ...FULL_CONSEQUENTIAL, recipientComplete: false },
    { ...FULL_CONSEQUENTIAL, mailingSubmitted: false },
    { ...FULL_CONSEQUENTIAL, trackingNumber: null },
    { ...FULL_CONSEQUENTIAL, proofReady: false },
  ];
  for (const cs of failingStates) {
    const result = runDisputePipeline(VALID_INPUT, cs);
    expect(result.ready).toBe(false);
  }
});

test("pipeline does not fabricate facts not in analysis", () => {
  const result = runDisputePipeline(VALID_INPUT);
  expect(result.draft.includes("99999")).toBe(false);
});

test("pipeline audit trail covers all stages", () => {
  const result = runDisputePipeline(VALID_INPUT);
  expect(result.stages.length).toBeGreaterThanOrEqual(10);
  for (const stage of result.stages) {
    expect(stage.stage).toBeTruthy();
    expect(["passed", "failed", "blocked", "skipped"]).toContain(stage.status);
  }
});
