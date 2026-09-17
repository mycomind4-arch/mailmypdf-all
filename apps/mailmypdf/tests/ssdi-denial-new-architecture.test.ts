import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SSDI_REQUIRED_FORMS,
  SSDI_STEPS,
  hasRequiredSsdiForms,
  isSsdiReconsiderationStage,
  ssdiCompletedSteps,
} from "../../../appeal-mail/workflows/appeal-ssdi-denial/start/workflow";
import { validateCaseInput } from "../src/lib/secure-core/case-inputs.server";
import { validateNoticeAnalysis } from "../src/lib/secure-core/workflow-runtime";
import { workflowAuthorityForPath } from "../src/lib/workflow-authority-registry";

test("SSDI denial uses the shared eight-step execution contract", () => {
  assert.deepEqual(
    SSDI_STEPS.map((step) => step.id),
    ["decision", "analysis", "claimant", "evidence", "draft", "forms", "review", "mail"],
  );
});

test("SSDI reconsideration requires all three official SSA forms to be clean and included", () => {
  const documents = SSDI_REQUIRED_FORMS.map((form) => ({
    evidence_kind: form.kind,
    included: true,
    usable: true,
  }));
  assert.equal(hasRequiredSsdiForms(documents, "medical"), true);
  assert.equal(hasRequiredSsdiForms(documents.slice(0, 2), "medical"), false);
  assert.equal(hasRequiredSsdiForms(documents.map((item, index) => index === 1 ? { ...item, usable: false } : item), "medical"), false);
  assert.equal(hasRequiredSsdiForms(documents.map((item, index) => index === 2 ? { ...item, included: false } : item), "medical"), false);
  assert.equal(hasRequiredSsdiForms(documents.slice(0, 1), "nonmedical"), true);
  assert.equal(hasRequiredSsdiForms([], "nonmedical"), false);
  assert.equal(hasRequiredSsdiForms(documents, "unknown"), false);
});

test("SSDI workflow fails closed for an unconfirmed or non-reconsideration appeal stage", () => {
  assert.equal(isSsdiReconsiderationStage("reconsideration"), true);
  assert.equal(isSsdiReconsiderationStage("hearing"), false);
  assert.equal(isSsdiReconsiderationStage("appeals_council"), false);
  assert.equal(isSsdiReconsiderationStage("unknown"), false);
  assert.equal(isSsdiReconsiderationStage(undefined), false);
});

test("SSDI claimant facts are versionable structured input and require explicit reconsideration confirmation", () => {
  const valid = {
    claimantName: "Test Claimant",
    claimantAddress: "123 Main St\nAnywhere, CA 95501",
    phone: "707-555-0100",
    representativeName: "",
    responseMode: "reconsideration",
    confirmedReconsideration: true,
    reasonsForDisagreement: "The denial does not reflect the limitations described in the submitted records.",
    conditionChanges: "",
    newConditions: "",
    treatmentChanges: "",
    medicationChanges: "",
    workChanges: "",
    dailyFunctionChanges: "",
    additionalFacts: "",
    requestedOutcome: "Reconsider the denial.",
  };
  assert.equal(validateCaseInput("ssdi-denial", valid).responseMode, "reconsideration");
  assert.throws(() => validateCaseInput("ssdi-denial", { ...valid, confirmedReconsideration: false }));
  assert.throws(() => validateCaseInput("ssdi-denial", { ...valid, reasonsForDisagreement: "" }));
});

test("SSDI analysis records appeal stage explicitly without inventing one", () => {
  const analysis = validateNoticeAnalysis({
    decision: "Denied",
    issuer: "Social Security Administration",
    referenceNumber: null,
    decisionDate: null,
    deadline: null,
    confidence: "medium",
    summary: "The notice denies the claim.",
    reasons: ["Medical evidence was found insufficient."],
    missingInformation: [],
    suggestedEvidence: ["Updated treatment records"],
    promptInjectionObserved: false,
    workflowDetails: {
      appealStage: "reconsideration",
      decisionBasis: "medical",
      taxYear: null,
      amountDue: null,
      proposedTax: null,
      proposedPenalty: null,
      proposedInterest: null,
      proposedIncomeChanges: [],
      payerReferences: [],
      responseAddress: null,
      paymentInstructions: null,
    },
  });
  assert.equal(analysis.workflowDetails.appealStage, "reconsideration");
  assert.equal(analysis.workflowDetails.decisionBasis, "medical");
});

test("new Appeal Mail SSDI workspace resolves to the authenticated execution route", () => {
  const authority = workflowAuthorityForPath("/appeal-mail/workflows/appeal-ssdi-denial");
  assert.ok(authority);
  assert.equal(authority.executionHref, "/appeal-mail/workflows/appeal-ssdi-denial/start");
});

test("step completion never marks review complete before immutable packet approval", () => {
  const completed = ssdiCompletedSteps({
    hasCleanDecision: true,
    hasReconsiderationAnalysis: true,
    hasClaimantFacts: true,
    hasDraft: true,
    hasRequiredForms: true,
    hasApproval: false,
  });
  assert.deepEqual(completed, ["decision", "analysis", "claimant", "evidence", "draft", "forms"]);
  assert.equal(completed.includes("review"), false);
});
