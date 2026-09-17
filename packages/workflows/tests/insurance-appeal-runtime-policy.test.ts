import assert from "node:assert/strict";
import test from "node:test";
import {
  INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS,
  createInsuranceAppealRuntimePolicy,
  getInsuranceAppealRuntimePolicy,
  insuranceAppealEvidenceReviewFingerprint,
  validateInsuranceAppealRuntimeInput,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowMatterSnapshot,
  type WorkflowRuntimeStoredInput,
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

test("insurance appeal facts are trimmed and evidence review defaults fail closed", () => {
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
  assert.equal(value.evidenceReviewComplete, false);

  const reviewed = validateInsuranceAppealRuntimeInput({
    claimantName: "Jane Doe",
    claimantAddress: "1 Main St",
    reasonsForDisagreement: "Reason",
    requestedOutcome: "Review",
    evidenceReviewComplete: true,
  });
  assert.equal(reviewed.evidenceReviewComplete, true);

  assert.throws(
    () => validateInsuranceAppealRuntimeInput({
      claimantName: "",
      claimantAddress: "1 Main St",
      reasonsForDisagreement: "Reason",
      requestedOutcome: "Review",
    }),
    /Claimant name is required/i,
  );
  assert.throws(
    () => validateInsuranceAppealRuntimeInput({
      claimantName: "Jane Doe",
      claimantAddress: "1 Main St",
      reasonsForDisagreement: "Reason",
      requestedOutcome: "Review",
      evidenceReviewComplete: "yes",
    }),
    /Evidence review complete must be true or false/i,
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

function matterSnapshot(
  workflowId: string,
  documents: readonly WorkflowMatterDocument[],
): WorkflowMatterSnapshot {
  return {
    matter: {
      id: "matter-1",
      workflowId,
      verticalId: "appeal-mail",
      status: "active",
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    },
    documents: [...documents],
  };
}

function reviewedInput(
  input: Record<string, unknown>,
): WorkflowRuntimeStoredInput {
  return {
    version: 1,
    input,
    createdAt: "2026-09-17T00:00:00.000Z",
  };
}

test("insurance evidence review is bound to the exact current source and evidence set", () => {
  const workflowId = "appeal-medical-necessity-denial";
  const policy = getInsuranceAppealRuntimePolicy(workflowId)!;
  const evidence: WorkflowMatterDocument = {
    ...cleanSource,
    id: "evidence-link",
    documentId: "evidence-doc",
    role: "evidence",
    evidenceKind: "medical_record",
    included: true,
    position: 1,
    filename: "medical-record.pdf",
  };
  const currentMatter = matterSnapshot(workflowId, [cleanSource, evidence]);
  const normalized = policy.validateInput(
    {
      claimantName: "Jane Doe",
      claimantAddress: "1 Main St",
      reasonsForDisagreement: "The denial does not address the current record.",
      requestedOutcome: "Reconsider the denial.",
      evidenceReviewComplete: true,
      evidenceReviewFingerprint: "client-spoofed-value",
    },
    analysis(),
    currentMatter,
  );

  assert.equal(normalized.evidenceReviewComplete, true);
  assert.equal(
    normalized.evidenceReviewFingerprint,
    insuranceAppealEvidenceReviewFingerprint(currentMatter.documents),
  );
  assert.notEqual(normalized.evidenceReviewFingerprint, "client-spoofed-value");

  const stored = reviewedInput(normalized);
  assert.doesNotThrow(() =>
    policy.validateBeforeDraft?.({
      matter: currentMatter,
      caseInput: stored,
      analysis: analysis(),
    }),
  );

  const changedMatter = matterSnapshot(workflowId, [
    cleanSource,
    { ...evidence, included: false },
  ]);
  assert.throws(
    () =>
      policy.validateBeforeDraft?.({
        matter: changedMatter,
        caseInput: stored,
        analysis: analysis(),
      }),
    /changed after review/i,
  );
  assert.throws(
    () =>
      policy.validateBeforePacket?.({
        matter: changedMatter,
        caseInput: stored,
        analysis: analysis(),
      }),
    /changed after review/i,
  );
});

test("insurance drafting fails closed until evidence review is explicitly completed", () => {
  const workflowId = "appeal-dental-insurance-denial";
  const policy = getInsuranceAppealRuntimePolicy(workflowId)!;
  const currentMatter = matterSnapshot(workflowId, [cleanSource]);
  const normalized = policy.validateInput(
    {
      claimantName: "Jane Doe",
      claimantAddress: "1 Main St",
      reasonsForDisagreement: "The denial is incomplete.",
      requestedOutcome: "Reconsider the denial.",
      evidenceReviewComplete: false,
    },
    analysis(),
    currentMatter,
  );

  assert.throws(
    () =>
      policy.validateBeforeDraft?.({
        matter: currentMatter,
        caseInput: reviewedInput(normalized),
        analysis: analysis(),
      }),
    /complete the supporting-evidence review/i,
  );
});

