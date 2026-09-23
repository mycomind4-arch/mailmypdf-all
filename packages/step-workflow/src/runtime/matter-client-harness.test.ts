import assert from "node:assert/strict";
import test from "node:test";
import type { StepWorkflowDefinition } from "../step-workflow.js";
import { projectMatterToStepState, type DeriveSteps, type StepProjectionContext } from "./matter-client-harness.js";

const definition: StepWorkflowDefinition = {
  id: "test-workflow",
  title: "Test workflow",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

function baseSnapshot(overrides: Partial<StepProjectionContext> = {}): StepProjectionContext {
  return {
    matter: {
      id: "matter-1",
      workflowId: "test-workflow",
      verticalId: "test-vertical",
      status: "active",
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    },
    documents: [],
    analysis: null,
    input: null,
    draft: null,
    approval: null,
    ...overrides,
  };
}

const deriveSteps: DeriveSteps = (snapshot) => ({
  intake: {
    status: snapshot.documents.length > 0 ? "complete" : "not_started",
    data: { documentCount: snapshot.documents.length },
  },
  documents: {
    status: snapshot.analysis ? "complete" : snapshot.documents.length > 0 ? "in_progress" : "not_started",
  },
  review: {
    status: snapshot.input ? "complete" : "not_started",
    data: { input: snapshot.input?.input ?? {} },
  },
  mail: {
    status: snapshot.approval ? "complete" : "not_started",
  },
});

test("projectMatterToStepState starts every step not_started with no snapshot data", () => {
  const state = projectMatterToStepState(definition, deriveSteps, baseSnapshot());
  assert.equal(state.id, "matter-1");
  assert.equal(state.workflowId, "test-workflow");
  assert.equal(state.steps.intake!.status, "not_started");
  assert.equal(state.steps.documents!.status, "not_started");
  assert.equal(state.currentStepId, "intake");
  assert.equal(state.approved, false);
});

test("projectMatterToStepState reflects uploaded documents", () => {
  const snapshot = baseSnapshot({
    documents: [
      {
        id: "doc-row-1",
        documentId: "doc-1",
        role: "subject_notice",
        evidenceKind: null,
        pageCount: 2,
        included: true,
        position: 0,
        filename: "notice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        securityStatus: "clean",
        usable: true,
      },
    ],
  });
  const state = projectMatterToStepState(definition, deriveSteps, snapshot);
  assert.equal(state.steps.intake!.status, "complete");
  assert.equal(state.steps.intake!.data.documentCount, 1);
  assert.equal(state.currentStepId, "documents");
});

test("projectMatterToStepState marks the mail step complete once approval exists", () => {
  const snapshot = baseSnapshot({
    documents: [
      {
        id: "doc-row-1",
        documentId: "doc-1",
        role: "subject_notice",
        evidenceKind: null,
        pageCount: 2,
        included: true,
        position: 0,
        filename: "notice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        securityStatus: "clean",
        usable: true,
      },
    ],
    analysis: {
      version: 1,
      documentId: "doc-1",
      model: "test-model",
      createdAt: "2026-09-17T00:00:00.000Z",
      result: {
        decision: null,
        issuer: null,
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: "summary",
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
      },
    },
    input: { version: 1, input: { reason: "because" } },
    approval: { approvalId: "approval-1", packetSha256: "abc123", quote: { totalCents: 500 } },
  });
  const state = projectMatterToStepState(definition, deriveSteps, snapshot);
  assert.equal(state.approved, true);
  assert.equal(state.steps.mail!.status, "complete");
  assert.equal(state.steps.review!.data.input, snapshot.input?.input);
  assert.equal(state.currentStepId, "mail");
});

test("projectMatterToStepState reports the last active step as current once everything is complete", () => {
  const snapshot = baseSnapshot({
    documents: [
      {
        id: "doc-row-1",
        documentId: "doc-1",
        role: "subject_notice",
        evidenceKind: null,
        pageCount: 1,
        included: true,
        position: 0,
        filename: "notice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        securityStatus: "clean",
        usable: true,
      },
    ],
    analysis: {
      version: 1,
      documentId: "doc-1",
      model: "test-model",
      createdAt: "2026-09-17T00:00:00.000Z",
      result: {
        decision: null,
        issuer: null,
        referenceNumber: null,
        decisionDate: null,
        deadline: null,
        confidence: "high",
        summary: "summary",
        reasons: [],
        missingInformation: [],
        suggestedEvidence: [],
        promptInjectionObserved: false,
      },
    },
    input: { version: 1, input: { reason: "because" } },
    approval: { approvalId: "approval-1", packetSha256: "abc123", quote: { totalCents: 500 } },
  });
  const state = projectMatterToStepState(definition, deriveSteps, snapshot);
  const allComplete = Object.values(state.steps).every((step) => step.status === "complete");
  assert.equal(allComplete, true);
  assert.equal(state.currentStepId, "mail");
});
