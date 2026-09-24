import { describe, expect, it } from "vitest";

import {
  projectMatterToStepState,
  type StepProjectionContext,
} from "@mailmypdf/step-workflow";

import {
  immigrationFilingCoverLetterStepWorkflow,
} from "./start/workflow";

import {
  deriveImmigrationFilingCoverLetterSteps,
} from "./start/step-projection";

function snapshot(
  overrides: Partial<StepProjectionContext> = {},
): StepProjectionContext {
  return {
    matter: {
      id: "matter-1",
      workflowId: "immigration-filing-cover-letter",
      verticalId: "immigration-mail",
      status: "active",
      createdAt: "2026-09-23T00:00:00.000Z",
      updatedAt: "2026-09-23T00:00:00.000Z",
    },
    documents: [],
    analysis: null,
    input: null,
    draft: null,
    approval: null,
    ...overrides,
  };
}

const cleanPrimary = {
  id: "matter-doc-1",
  documentId: "document-1",
  role: "subject_notice" as const,
  evidenceKind: null,
  pageCount: 2,
  included: true,
  position: 0,
  filename: "i-485.pdf",
  mimeType: "application/pdf",
  sizeBytes: 5000,
  securityStatus: "clean",
  usable: true,
};

describe("Immigration Filing Cover Letter matter projection", () => {
  it("starts on filing with an empty matter", () => {
    const state = projectMatterToStepState(
      immigrationFilingCoverLetterStepWorkflow,
      deriveImmigrationFilingCoverLetterSteps,
      snapshot(),
    );

    expect(state.currentStepId).toBe("filing");
    expect(state.steps.filing.status).toBe("not_started");
    expect(state.approved).toBe(false);
  });

  it("moves to analysis after a clean filing document exists", () => {
    const state = projectMatterToStepState(
      immigrationFilingCoverLetterStepWorkflow,
      deriveImmigrationFilingCoverLetterSteps,
      snapshot({
        documents: [cleanPrimary],
      }),
    );

    expect(state.steps.filing.status).toBe("complete");
    expect(state.currentStepId).toBe("analysis");
  });

  it("moves through facts, documents, draft, and review from persisted matter state", () => {
    const state = projectMatterToStepState(
      immigrationFilingCoverLetterStepWorkflow,
      deriveImmigrationFilingCoverLetterSteps,
      snapshot({
        documents: [cleanPrimary],
        analysis: {
          version: 1,
          documentId: "document-1",
          model: "test-model",
          createdAt: "2026-09-23T00:00:00.000Z",
          result: {
            decision: null,
            issuer: "USCIS",
            referenceNumber: null,
            decisionDate: null,
            deadline: null,
            confidence: "high",
            summary: "Filing details extracted.",
            reasons: [],
            missingInformation: [],
            suggestedEvidence: [],
            promptInjectionObserved: false,
          },
        },
        input: {
          version: 1,
          input: {
            applicantName: "Test Applicant",
            filingType: "I-485",
          },
        },
        draft: {
          version: 1,
          bodyText: "Cover letter draft",
          createdAt: "2026-09-23T00:00:00.000Z",
        },
      }),
    );

    expect(state.steps.filing.status).toBe("complete");
    expect(state.steps.analysis.status).toBe("complete");
    expect(state.steps.facts.status).toBe("complete");
    expect(state.steps.documents.status).toBe("complete");
    expect(state.steps.draft.status).toBe("complete");
    expect(state.steps.review.status).toBe("in_progress");
    expect(state.currentStepId).toBe("review");
  });

  it("unlocks the mail step after packet approval", () => {
    const state = projectMatterToStepState(
      immigrationFilingCoverLetterStepWorkflow,
      deriveImmigrationFilingCoverLetterSteps,
      snapshot({
        documents: [cleanPrimary],
        analysis: {
          version: 1,
          documentId: "document-1",
          model: "test-model",
          createdAt: "2026-09-23T00:00:00.000Z",
          result: {
            decision: null,
            issuer: "USCIS",
            referenceNumber: null,
            decisionDate: null,
            deadline: null,
            confidence: "high",
            summary: "Filing details extracted.",
            reasons: [],
            missingInformation: [],
            suggestedEvidence: [],
            promptInjectionObserved: false,
          },
        },
        input: {
          version: 1,
          input: { applicantName: "Test Applicant" },
        },
        draft: {
          version: 1,
          bodyText: "Cover letter draft",
          createdAt: "2026-09-23T00:00:00.000Z",
        },
        approval: {
          approvalId: "approval-1",
          packetSha256: "abc123",
          quote: { totalCents: 500 },
        },
      }),
    );

    expect(state.approved).toBe(true);
    expect(state.steps.review.status).toBe("complete");
    expect(state.steps.mail.status).toBe("in_progress");
    expect(state.currentStepId).toBe("mail");
  });
});
