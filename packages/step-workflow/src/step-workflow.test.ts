import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  approveMatter,
  assertStepMatterOwner,
  completeStep,
  createStepMatterState,
  getStepMatterProgress,
  setChecklistItem,
  updateStepData,
  type StepWorkflowDefinition,
} from "./step-workflow";

const testWorkflow: StepWorkflowDefinition = {
  id: "test-workflow",
  title: "Test Workflow",
  steps: [
    { id: "one", label: "One" },
    { id: "two", label: "Two" },
    { id: "send", label: "Send" },
  ],
  requiresApprovalBeforeStep: "send",
};

const now = "2026-09-10T20:00:00.000Z";

describe("step workflow runtime", () => {
  it("starts the first step in_progress and every other step not_started", () => {
    const state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    assert.equal(state.currentStepId, "one");
    assert.equal(state.steps.one.status, "in_progress");
    assert.equal(state.steps.two.status, "not_started");
    assert.equal(state.steps.send.status, "not_started");
    assert.equal(state.version, 1);
  });

  it("updateStepData merges into the step's data and bumps version", () => {
    const state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    const next = updateStepData(state, "one", { propertyAddress: "123 Main St" }, now);
    assert.deepEqual(next.steps.one.data, { propertyAddress: "123 Main St" });
    assert.equal(next.version, 2);
  });

  it("setChecklistItem upserts by item id", () => {
    let state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    state = setChecklistItem(state, "one", { id: "a", label: "A", done: false }, now);
    assert.deepEqual(state.steps.one.checklist, [{ id: "a", label: "A", done: false }]);
    state = setChecklistItem(state, "one", { id: "a", label: "A", done: true }, now);
    assert.deepEqual(state.steps.one.checklist, [{ id: "a", label: "A", done: true }]);
  });

  it("completeStep marks the step complete and advances currentStepId to the next step", () => {
    const state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    const next = completeStep(state, testWorkflow, "one", now);
    assert.equal(next.steps.one.status, "complete");
    assert.equal(next.steps.one.completedAt, now);
    assert.equal(next.currentStepId, "two");
    assert.equal(next.steps.two.status, "in_progress");
  });

  it("rejects completing a later step before the current step", () => {
    const state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });

    assert.throws(() => completeStep(state, testWorkflow, "two", now), /current step/);
    assert.equal(state.steps.one.status, "in_progress");
    assert.equal(state.steps.two.status, "not_started");
  });

  it("getStepMatterProgress reports completed vs total step counts", () => {
    let state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    assert.deepEqual(getStepMatterProgress(testWorkflow, state), { completed: 0, total: 3 });
    state = completeStep(state, testWorkflow, "one", now);
    assert.deepEqual(getStepMatterProgress(testWorkflow, state), { completed: 1, total: 3 });
  });

  it("blocks completing the approval-gated step until the matter is approved", () => {
    let state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    state = completeStep(state, testWorkflow, "one", now);
    state = completeStep(state, testWorkflow, "two", now);
    assert.throws(() => completeStep(state, testWorkflow, "send", now), /requires matter approval/);

    state = approveMatter(state, now);
    assert.equal(state.approved, true);
    const sent = completeStep(state, testWorkflow, "send", now);
    assert.equal(sent.steps.send.status, "complete");
  });

  it("assertStepMatterOwner throws when the owner does not match", () => {
    const state = createStepMatterState({ id: "matter-1", ownerId: "owner-1", definition: testWorkflow, now });
    assert.throws(() => assertStepMatterOwner(state, "owner-2"), /not accessible/);
    assert.doesNotThrow(() => assertStepMatterOwner(state, "owner-1"));
  });
});


it("conditional steps are skipped until their declarative condition is true", () => {
  const conditional: StepWorkflowDefinition = {
    id: "conditional",
    title: "Conditional",
    steps: [
      { id: "intake", label: "Intake" },
      { id: "evidence", label: "Evidence", condition: { kind: "data_equals", stepId: "intake", path: "needsEvidence", value: true } },
      { id: "review", label: "Review" },
    ],
  };
  let state = createStepMatterState({ id:"m1",ownerId:"u1",definition:conditional,now });
  assert.deepEqual(getStepMatterProgress(conditional,state),{completed:0,total:2});
  state = completeStep(state,conditional,"intake",now);
  assert.equal(state.currentStepId,"review");

  let state2 = createStepMatterState({ id:"m2",ownerId:"u1",definition:conditional,now });
  state2 = updateStepData(state2,"intake",{needsEvidence:true},now);
  assert.deepEqual(getStepMatterProgress(conditional,state2),{completed:0,total:3});
  state2 = completeStep(state2,conditional,"intake",now);
  assert.equal(state2.currentStepId,"evidence");
});
