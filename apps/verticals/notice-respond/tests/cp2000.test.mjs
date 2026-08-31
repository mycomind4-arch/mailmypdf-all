import assert from "node:assert/strict";
import test from "node:test";
import { extractCP2000, generateCP2000Draft } from "../src/domain/cp2000.ts";
import { classifyNoticeType } from "../src/domain/notice-type.ts";
import { validateDraft } from "../src/domain/draft-validator.ts";
import { getWorkflowById } from "../src/domain/workflow-catalog.ts";
import { createWorkflowState, advanceStep, canAdvance, setExtraction, setUpload, setUserFacts, setUserObjective, setDraft, setReviewChecks, approveWorkflow } from "../src/domain/workflow-runtime.ts";

// ── Fixtures ──────────────────────────────────────────────────

const CP2000_CLEAN = `
Internal Revenue Service
Department of the Treasury
Notice CP2000
Notice Number: CP2000-2024-12345-A
Notice Date: March 15, 2024
Tax Year 2023

We are proposing changes to your 2023 tax return based on income reported to us that doesn't match your return.

You reported income of: $45,000
Income reported to us on Form W-2: $52,000
Proposed increase in tax: $1,200
Estimated penalty: $240

If you agree with our proposed changes, sign and return the response form.
If you disagree, send us documentation showing why the proposed changes are wrong.

Please respond by May 14, 2024.

Send your response to:
IRS — Automated Underreporter
P.O. Box 9019
Holtsville, NY 11742-9019

Call us at 800-555-1234 if you have questions.
`;

const CP2000_NO_DEADLINE = `
Internal Revenue Service
Notice CP2000-2023-67890-B
Tax Year 2022
We propose changes to your 2022 return.
Income you reported: $30,000
Income from Form 1099-NEC: $38,000
Proposed tax increase: $1,800
Penalty: $360
`;

const CP2000_MISSING_TAX_YEAR = `
Internal Revenue Service
CP2000-2024-11111-C
Notice Date: January 10, 2024
Please respond by March 10, 2024.
We are proposing changes based on underreported income.
You reported $40,000. We received $48,000.
`;

const NON_CP2000 = `
Superior Court of California
Summons
Case Number: CV-2024-1234
You are hereby summoned to appear in court.
You must file a response within 30 days of service.
`;

const CP2000_CONFLICTING = `
Internal Revenue Service
CP2000-2024-99999-X
Tax Year 2023
Notice Date: April 1, 2024
Respond by June 1, 2024.
You reported $50,000 on your return.
We received $50,000 from Form W-2.
Proposed tax increase: $0
`;

// ── Tests ─────────────────────────────────────────────────────

test("CP2000 classification: correctly identifies CP2000 notice", () => {
  const result = classifyNoticeType(CP2000_CLEAN);
  assert.equal(result.type, "irs_cp2000");
  assert.ok(result.confidence > 0.4, "Confidence should be reasonable");
});

test("CP2000 extraction: extracts notice number", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.ok(ext.isCP2000, "Should be classified as CP2000");
  assert.ok(ext.noticeNumber, "Should extract notice number");
  assert.ok(ext.noticeNumber.includes("CP2000"), `Notice number should contain CP2000, got: ${ext.noticeNumber}`);
});

test("CP2000 extraction: extracts notice date", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.ok(ext.noticeDate, "Should extract notice date");
});

test("CP2000 extraction: extracts response deadline", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.ok(ext.responseDeadline, "Should extract response deadline");
  assert.ok(ext.responseDeadline.includes("May"), `Expected May, got: ${ext.responseDeadline}`);
});

test("CP2000 extraction: extracts tax year", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.equal(ext.taxYear, "2023", `Expected tax year 2023, got: ${ext.taxYear}`);
});

test("CP2000 extraction: extracts proposed amounts", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.ok(ext.proposedTaxIncrease, "Should extract proposed tax increase");
  assert.ok(ext.proposedPenalty, "Should extract proposed penalty");
});

test("CP2000 extraction: extracts income amounts", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  assert.ok(ext.reportedIncome, "Should extract reported income");
  assert.ok(ext.irsReportedIncome, "Should extract IRS reported income");
});

test("CP2000 extraction: facts have provenance", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  for (const fact of ext.facts) {
    assert.equal(fact.source, "extracted", "All extracted facts should have source 'extracted'");
    assert.ok(fact.confidence, "Each fact should have a confidence level");
  }
});

test("CP2000 extraction: warns when deadline is missing", () => {
  const ext = extractCP2000(CP2000_NO_DEADLINE);
  assert.ok(ext.warnings.some((w) => w.toLowerCase().includes("deadline")), "Should warn about missing deadline");
});

test("CP2000 extraction: warns when tax year is missing", () => {
  const ext = extractCP2000(CP2000_MISSING_TAX_YEAR);
  assert.ok(ext.warnings.some((w) => w.toLowerCase().includes("tax year")), "Should warn about missing tax year");
});

test("CP2000 extraction: rejects non-CP2000 document", () => {
  const ext = extractCP2000(NON_CP2000);
  assert.equal(ext.isCP2000, false, "Court summons should not be classified as CP2000");
  assert.ok(ext.warnings.some((w) => w.includes("not a CP2000") || w.includes("classified as")), "Should warn about misclassification");
});

test("CP2000 draft generation: includes notice number and tax year", () => {
  const ext = extractCP2000(CP2000_CLEAN);
  const draft = generateCP2000Draft({
    noticeNumber: ext.noticeNumber,
    taxYear: ext.taxYear,
    noticeDate: ext.noticeDate,
    responseDeadline: ext.responseDeadline,
    userFacts: "My W-2 shows the correct income of $45,000.",
    userObjective: "I want to explain the discrepancy and provide my W-2 as evidence.",
  });
  assert.ok(draft.includes(ext.noticeNumber), "Draft should contain notice number");
  assert.ok(draft.includes("2023"), "Draft should contain tax year");
  assert.ok(draft.includes("May 14, 2024"), "Draft should contain response deadline");
  assert.ok(draft.includes("Dear Sir or Madam"), "Draft should have proper salutation");
});

test("CP2000 draft validation: passes for well-formed draft", () => {
  const def = getWorkflowById("cp2000-response");
  const ext = extractCP2000(CP2000_CLEAN);
  const draft = generateCP2000Draft({
    noticeNumber: ext.noticeNumber,
    taxYear: ext.taxYear,
    noticeDate: ext.noticeDate,
    responseDeadline: ext.responseDeadline,
    userFacts: "My W-2 shows $45,000 for 2023.",
    userObjective: "Explain the discrepancy.",
  });
  const validation = validateDraft(draft, ext.facts, def, {
    expectedNoticeNumber: ext.noticeNumber,
    expectedTaxYear: ext.taxYear,
    expectedDeadline: ext.responseDeadline,
  });
  // Should have 0 errors (warnings are acceptable)
  assert.equal(validation.errors, 0, `Expected 0 errors, got ${validation.errors}: ${validation.findings.filter(f => !f.passed && f.severity === "error").map(f => f.detail).join("; ")}`);
});

test("CP2000 draft validation: detects missing required section", () => {
  const def = getWorkflowById("cp2000-response");
  const ext = extractCP2000(CP2000_CLEAN);
  const badDraft = "This is a short response with no required sections.";
  const validation = validateDraft(badDraft, ext.facts, def, {
    expectedNoticeNumber: ext.noticeNumber,
  });
  assert.ok(validation.errors > 0, "Should detect missing required sections");
});

test("CP2000 draft validation: detects mismatched notice number", () => {
  const def = getWorkflowById("cp2000-response");
  const ext = extractCP2000(CP2000_CLEAN);
  const draft = generateCP2000Draft({
    noticeNumber: "WRONG-NUMBER",
    taxYear: ext.taxYear,
    noticeDate: ext.noticeDate,
    responseDeadline: ext.responseDeadline,
    userFacts: "My records show the correct amount.",
    userObjective: "Dispute the proposed changes.",
  });
  const validation = validateDraft(draft, ext.facts, def, {
    expectedNoticeNumber: ext.noticeNumber,
  });
  const noticeNumFinding = validation.findings.find((f) => f.check === "notice_number_consistency");
  assert.ok(noticeNumFinding, "Should have a notice number consistency check");
  assert.equal(noticeNumFinding.passed, false, "Should detect mismatched notice number");
});

test("CP2000 draft validation: detects draft too short", () => {
  const def = getWorkflowById("cp2000-response");
  const validation = validateDraft("Too short", [], def, {});
  assert.ok(validation.errors > 0, "Should detect draft that is too short");
});

test("CP2000 workflow state: create initial state", () => {
  const def = getWorkflowById("cp2000-response");
  const state = createWorkflowState(def);
  assert.equal(state.workflowId, "cp2000-response");
  assert.equal(state.step, 0);
  assert.equal(state.phase, "intro");
  assert.equal(state.upload, null);
  assert.equal(state.extraction, null);
  assert.equal(state.approved, false);
  assert.ok(state.reviewChecks.length > 0, "Should have review checks from definition");
});

test("CP2000 workflow state: advance through steps", () => {
  const def = getWorkflowById("cp2000-response");
  let state = createWorkflowState(def);
  assert.equal(state.phase, "intro");
  
  state = advanceStep(state, def);
  assert.equal(state.phase, "document");
  
  state = advanceStep(state, def);
  assert.equal(state.phase, "extraction");
});

test("CP2000 workflow state: can advance requires facts at facts step", () => {
  const def = getWorkflowById("cp2000-response");
  let state = createWorkflowState(def);
  
  // Advance to facts step (step 3)
  state = advanceStep(state, def); // document
  state = advanceStep(state, def); // extraction
  state = advanceStep(state, def); // facts
  
  assert.equal(state.phase, "facts");
  assert.equal(canAdvance(state, def), false, "Cannot advance without user facts");
  
  state = setUserFacts(state, "My W-2 shows the correct amount.");
  assert.equal(canAdvance(state, def), true, "Can advance with user facts");
});

test("CP2000 workflow state: can advance requires objective at objective step", () => {
  const def = getWorkflowById("cp2000-response");
  let state = createWorkflowState(def);
  
  state = advanceStep(state, def); // intro → document
  state = advanceStep(state, def); // document → extraction
  state = advanceStep(state, def); // extraction → facts
  state = setUserFacts(state, "Facts here");
  state = advanceStep(state, def); // facts → objective
  
  assert.equal(state.phase, "objective");
  assert.equal(canAdvance(state, def), false, "Cannot advance without objective");
  
  state = setUserObjective(state, "Explain the discrepancy.");
  assert.equal(canAdvance(state, def), true, "Can advance with objective");
});

test("CP2000 workflow state: review checks must all be checked", () => {
  const def = getWorkflowById("cp2000-response");
  let state = createWorkflowState(def);
  
  // Fast-forward to review
  state = { ...state, step: 6, phase: "review" };
  state = setUserFacts(state, "Facts");
  state = setUserObjective(state, "Objective");
  
  assert.equal(canAdvance(state, def), false, "Cannot advance with unchecked review");
  
  state = setReviewChecks(state, state.reviewChecks.map(() => true));
  // Review checks prove readiness but do not authorize — explicit approval required
  assert.equal(state.approved, false, "Review checks alone do not approve");
  state = approveWorkflow(state);
  assert.equal(state.approved, true, "Should be approved after explicit approveWorkflow");
  assert.equal(canAdvance(state, def), true, "Can advance with all checks true");
});

test("CP2000 workflow state: set extraction populates facts", () => {
  const def = getWorkflowById("cp2000-response");
  let state = createWorkflowState(def);
  const ext = extractCP2000(CP2000_CLEAN);
  
  state = setExtraction(state, {
    noticeType: "irs_cp2000",
    classificationConfidence: 0.85,
    facts: ext.facts,
    deadlines: [],
    agency: "IRS",
    referenceNumber: ext.noticeNumber ?? undefined,
    rawText: CP2000_CLEAN,
    extractionConfidence: 0.85,
  });
  
  assert.ok(state.extractedFacts.length > 0, "Should have extracted facts");
  assert.ok(state.extraction, "Should have extraction result");
});

test("CP2000 catalog: has correct quality gate settings", () => {
  const def = getWorkflowById("cp2000-response");
  assert.equal(def.qualityGate.documentRecognition, true, "CP2000 should have document recognition");
  assert.equal(def.qualityGate.draftValidation, true, "CP2000 should have draft validation");
  assert.equal(def.qualityGate.factGrounding, true, "CP2000 should have fact grounding");
  assert.equal(def.qualityGate.deadlineVerification, true, "CP2000 should have deadline verification");
});

test("CP2000 catalog: has extraction fields for key CP2000 data", () => {
  const def = getWorkflowById("cp2000-response");
  const fields = def.documents[0].extractionFields;
  assert.ok(fields.includes("taxYear"), "Should extract tax year");
  assert.ok(fields.includes("responseDeadline"), "Should extract response deadline");
  assert.ok(fields.includes("proposedChange"), "Should extract proposed change");
  assert.ok(fields.includes("reportedIncome"), "Should extract reported income");
  assert.ok(fields.includes("irsReportedIncome"), "Should extract IRS reported income");
});

test("CP2000 catalog: has FAQ for SEO", () => {
  const def = getWorkflowById("cp2000-response");
  assert.ok(def.seo?.faq?.length >= 4, "Should have at least 4 FAQ entries");
  assert.ok(def.seo?.faq?.some((f) => f.question.includes("What is a CP2000")), "Should have 'what is CP2000' FAQ");
  assert.ok(def.seo?.faq?.some((f) => f.question.includes("How long")), "Should have deadline FAQ");
});

test("CP2000 catalog: lifecycle is functional", () => {
  const def = getWorkflowById("cp2000-response");
  assert.equal(def.lifecycle, "functional");
  assert.notEqual(def.lifecycle, "authority", "CP2000 should not be authority until all quality gates are fully validated in production");
});

test("CP2000 with conflicting amounts: extraction works correctly", () => {
  const ext = extractCP2000(CP2000_CONFLICTING);
  assert.ok(ext.isCP2000, "Should still classify as CP2000");
  // With $0 proposed increase, the extractor should still work
  assert.ok(ext.taxYear, "Should extract tax year even with no proposed increase");
});
