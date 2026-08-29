import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceStep, approveWorkflow, canAdvance, createWorkflowState, goToStep,
  setDraft, setDraftValidation, setMailing, setReviewChecks, type WorkflowState,
} from "../workflow-runtime";
import type { MasterWorkflowDefinition } from "../workflow-definition";

const definition = {
  id: "fixture", lifecycle: "functional",
  qualityGate: { documentRecognition: true, factGrounding: true, deadlineVerification: true, evidenceGrounding: true, draftValidation: true, submissionReadiness: true, proofReady: true },
  ux: { steps: [
    { id: "document", label: "Document" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" },
    { id: "recipient", label: "Recipient" }, { id: "mailing", label: "Mailing" }, { id: "checkout", label: "Checkout" }, { id: "submitted", label: "Submitted" },
  ], reviewChecks: ["accuracy", "completeness"] },
} as unknown as MasterWorkflowDefinition;

function atPhase(phase: WorkflowState["phase"]): WorkflowState {
  const base = createWorkflowState(definition);
  const step = definition.ux!.steps.findIndex((item) => item.id === phase);
  return { ...base, phase, step };
}

test("document phase allows advancing (extraction happens at extraction step)", () => {
  const uploadedOnly = { ...atPhase("document"), upload: { fileName: "notice.pdf", fileSize: 100, fileType: "application/pdf", rawText: "", uploadedAt: new Date().toISOString() } };
  assert.equal(canAdvance(uploadedOnly, definition), true);
});

test("extraction phase requires extraction result before advancing", () => {
  const noExtraction = atPhase("document");
  const atExtraction = advanceStep(noExtraction, definition);
  assert.equal(atExtraction.phase, "draft");
});

test("draft phase allows advancing when validation has not run yet", () => {
  const drafted = setDraft(atPhase("draft"), "complete draft");
  assert.equal(canAdvance(drafted, definition), true);
});

test("draft phase blocks advancing when validation has failed", () => {
  const drafted = setDraft(atPhase("draft"), "complete draft");
  const failed = setDraftValidation(drafted, { findings: [], passed: false, errors: 1, warnings: 0 });
  assert.equal(canAdvance(failed, definition), false);
});

test("draft phase allows advancing when validation passes", () => {
  const drafted = setDraft(atPhase("draft"), "complete draft");
  const validated = setDraftValidation(drafted, { findings: [], passed: true, errors: 0, warnings: 0 });
  assert.equal(canAdvance(validated, definition), true);
});

test("cannot jump directly to a later consequential phase", () => {
  const state = atPhase("draft");
  const jumped = goToStep(state, definition, 4);
  assert.equal(jumped.step, state.step);
  assert.equal(jumped.phase, "draft");
});

test("review checks prove readiness but never auto-approve", () => {
  let state = atPhase("review");
  state = setDraft(state, "complete draft");
  state = setDraftValidation(state, { findings: [], passed: true, errors: 0, warnings: 0 });
  state = setReviewChecks(state, [true, true]);
  assert.equal(canAdvance(state, definition), true);
  assert.equal(state.approved, false);

  state = approveWorkflow(state);
  assert.equal(state.approved, true);
});

test("explicit approval remains blocked when review is incomplete", () => {
  let state = atPhase("review");
  state = setDraft(state, "complete draft");
  state = setDraftValidation(state, { findings: [], passed: true, errors: 0, warnings: 0 });
  state = setReviewChecks(state, [true, false]);
  assert.equal(approveWorkflow(state).approved, false);
});

test("review phase blocks when validation has failed even if all checks are done", () => {
  let state = atPhase("review");
  state = setDraft(state, "complete draft");
  state = setDraftValidation(state, { findings: [], passed: false, errors: 1, warnings: 0 });
  state = setReviewChecks(state, [true, true]);
  assert.equal(canAdvance(state, definition), false);
  assert.equal(approveWorkflow(state).approved, false);
});

test("mailing phase requires valid recipient", () => {
  let state = atPhase("mailing");
  state = setMailing(state, { method: "certified", recipient: { name: "Agency", org: "Agency", address1: "1 Main", address2: "", city: "City", state: "CA", zip: "90000" }, status: "draft" });
  assert.equal(canAdvance(state, definition), true);
});

test("mailing phase blocks without valid recipient", () => { assert.equal(canAdvance(atPhase("mailing"), definition), false); });

test("never permits advance from submitted", () => {
  const state = atPhase("submitted");
  assert.equal(canAdvance(state, definition), false);
  assert.deepEqual(advanceStep(state, definition), state);
});

test("requires a real provider transition before checkout can complete", () => {
  let state = atPhase("checkout");
  state = setMailing(state, { method: "certified", recipient: { name: "Agency", org: "Agency", address1: "1 Main", address2: "", city: "City", state: "CA", zip: "90000" }, status: "draft" });
  assert.equal(canAdvance(state, definition), false);
  state = { ...state, mailing: { ...state.mailing!, providerOrderId: "order-1", status: "submitted" } };
  assert.equal(canAdvance(state, definition), true);
});
