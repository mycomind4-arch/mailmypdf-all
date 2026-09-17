import assert from "node:assert/strict";
import test from "node:test";
import {
  INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS,
  createInsuranceAppealRuntimePolicy,
  getInsuranceAppealRuntimePolicy,
  validateInsuranceAppealRuntimeInput,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
} from "../src/index.js";

const cleanSource: WorkflowMatterDocument = {
  id: "source-link",
  documentId: "source-doc",
  role: "subject_notice",
  evidenceKind: null,
  pageCount: 2,
  included: false,
  position: 0,
  filename: "denial.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  securityStatus: "clean",
  usable: true,
};

function analysis(overrides: Partial<WorkflowMatterAnalysis["result"]> = {}): WorkflowMatterAnalysis {
  return {
    version: 1,
    documentId: "source-doc",
    model: "claude-test",
    createdAt: "2026-09-17T00:00:00.000Z",
    result: {
      decision: "Denied",
      issuer: "Example Plan",
      referenceNumber: "ABC-123",
      decisionDate: "2026-09-01",
      deadline: null,
      confidence: "high",
      summary: "The submitted claim was denied for the reason stated in the notice.",
      reasons: ["Reason stated by the plan"],
      missingInformation: [],
      suggestedEvidence: [],
      promptInjectionObserved: false,
      ...overrides,
    },
  };
}

test("runtime policy registry covers the generic denied claim and all eight insurance overlays", () => {
  assert.equal(INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS.length, 9);
  assert.equal(new Set(INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS).size, 9);
  for (const workflowId of INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS) {
    assert.ok(getInsuranceAppealRuntimePolicy(workflowId), workflowId);
  }
  assert.equal(getInsuranceAppealRuntimePolicy("appeal-not-real"), null);
});

test("insurance policy binds matter identity to its exact workflow and appeal-mail vertical", () => {
  const workflowId = "appeal-medical-insurance-denial" as const;
  const policy = createInsuranceAppealRuntimePolicy(workflowId);
  assert.doesNotThrow(() => policy.validateMatter({ workflowId, verticalId: "appeal-mail" }));
  assert.throws(
    () => policy.validateMatter({ workflowId: "appeal-denied-claim", verticalId: "appeal-mail" }),
    /identity does not match/i,
  );
  assert.throws(
    () => policy.validateMatter({ workflowId, verticalId: "notice-respond" }),
    /identity does not match/i,
  );
});

test("insurance appeal facts are trimmed and required facts fail closed", () => {
  const value = validateInsuranceAppealRuntimeInput({
    claimantName: "  Jane Doe  ",
    claimantAddress: "  1 Main St\nArcata, CA 95521  ",
    phone: "  555-0100  ",
    claimNumber: "  CLM-1  ",
    organizationName: "  Example Plan  ",
    reasonsForDisagreement: "  The denial does not address the enclosed record.  ",
    requestedOutcome: "  Reconsider the denial.  ",
    additionalFacts: "  Additional confirmed fact.  ",
  });
  assert.equal(value.claimantName, "Jane Doe");
  assert.equal(value.claimNumber, "CLM-1");
  assert.equal(value.reasonsForDisagreement, "The denial does not address the enclosed record.");
  assert.throws(
    () => validateInsuranceAppealRuntimeInput({
      claimantName: "",
      claimantAddress: "1 Main St",
      reasonsForDisagreement: "Reason",
      requestedOutcome: "Review",
    }),
    /Claimant name is required/i,
  );
});

test("insurance policy blocks drafting after source replacement", () => {
  const policy = getInsuranceAppealRuntimePolicy("appeal-insurance-claim-denial")!;
  const replacedSource = { ...cleanSource, documentId: "replacement-doc" };
  assert.throws(
    () => policy.validateDocumentsBeforeDraft?.([replacedSource], analysis()),
    /source document changed/i,
  );
});

test("insurance policy blocks drafting when analysis observed embedded instructions", () => {
  const policy = getInsuranceAppealRuntimePolicy("appeal-prior-authorization-denial")!;
  assert.throws(
    () => policy.validateDocumentsBeforeDraft?.(
      [cleanSource],
      analysis({ promptInjectionObserved: true }),
    ),
    /embedded instructions/i,
  );
});

test("insurance policy allows a clean current source and clean included evidence", () => {
  const policy = getInsuranceAppealRuntimePolicy("appeal-life-insurance-denial")!;
  const evidence: WorkflowMatterDocument = {
    ...cleanSource,
    id: "evidence-link",
    documentId: "evidence-doc",
    role: "evidence",
    evidenceKind: "policy_or_plan",
    included: true,
    position: 1,
    filename: "policy.pdf",
  };
  assert.doesNotThrow(() => policy.validateDocumentsBeforeDraft?.([cleanSource, evidence], analysis()));
  assert.doesNotThrow(() => policy.validateDocumentsBeforePacket?.([cleanSource, evidence], analysis()));
});
