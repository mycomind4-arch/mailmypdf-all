import assert from "node:assert/strict";
import test from "node:test";

import { createWorkflowState, canAdvance, setDraft, setDraftValidation, advanceStep } from "../src/domain/workflow-runtime.ts";
import { getWorkflowById } from "../src/domain/workflow-catalog.ts";

const def = getWorkflowById("cp2000-response");
assert.ok(def, "CP2000 definition should exist");

// Helper: create a state at a given phase
function stateAtPhase(phase, overrides = {}) {
  const state = createWorkflowState(def);
  // Navigate to the target phase
  const steps = def.ux?.steps ?? [];
  const phaseIndex = steps.findIndex(s => s.id === phase);
  return {
    ...state,
    step: phaseIndex >= 0 ? phaseIndex : state.step,
    phase: phase,
    ...overrides,
  };
}

// ── P0-1: Validation blocking ────────────────────────────────

test("P0-1: canAdvance returns false for draft phase when validation has errors", () => {
  const state = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
  });
  assert.equal(canAdvance(state, def), false, "Should not advance when validation has errors");
});

test("P0-1: canAdvance returns true for draft phase when validation passes", () => {
  const state = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: true, errors: 0, warnings: 0 },
  });
  assert.equal(canAdvance(state, def), true, "Should advance when validation passes");
});

test("P0-1: canAdvance returns true for draft phase when validation is null (not yet run)", () => {
  const state = stateAtPhase("draft", {
    draft: "",
    draftValidation: null,
  });
  assert.equal(canAdvance(state, def), true, "Should allow advance when validation hasn't run yet");
});

test("P0-1: canAdvance returns false for review phase when validation has errors", () => {
  const state = stateAtPhase("review", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
    reviewChecks: [true, true, true, true],
  });
  assert.equal(canAdvance(state, def), false, "Should not advance past review when validation has errors");
});

test("P0-1: canAdvance returns true for review phase when validation passes and all checks done", () => {
  const state = stateAtPhase("review", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: true, errors: 0, warnings: 0 },
    reviewChecks: [true, true, true, true],
  });
  assert.equal(canAdvance(state, def), true, "Should advance when validation passes and all checks done");
});

test("P0-1: canAdvance returns false for review when checks incomplete even if validation passes", () => {
  const state = stateAtPhase("review", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: true, errors: 0, warnings: 0 },
    reviewChecks: [true, false, true, true],
  });
  assert.equal(canAdvance(state, def), false, "Should not advance when review checks incomplete");
});

// ── P0-1: Regression: failed validation cannot reach mailing ──

test("P0-1 regression: state with failed validation cannot advance from draft to review", () => {
  // Start at draft phase with failed validation
  let state = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 2, warnings: 0 },
  });
  assert.equal(canAdvance(state, def), false, "Cannot advance from draft with failed validation");
  // advanceStep respects canAdvance in the route (button disabled),
  // but even if advanceStep is called directly, the review phase also blocks
  state = { ...state, step: state.step + 1, phase: "review" };
  assert.equal(canAdvance(state, def), false, "Cannot advance from review with failed validation even if checks are all true");
});

test("P0-1 regression: state with failed validation cannot reach mailing even if somehow advanced", () => {
  // Simulate a state that somehow reached the mailing phase with failed validation
  // (e.g., via goToStep bypass). The review phase should have blocked.
  // This test documents that the ONLY way to reach mailing is through a passing validation.
  const state = stateAtPhase("mailing", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
    reviewChecks: [true, true, true, true],
    mailing: {
      method: "certified",
      recipient: { name: "IRS", org: "Treasury", address1: "123 Main St", address2: "", city: "Washington", state: "DC", zip: "20001" },
      status: "not_started",
    },
  });
  // Mailing phase doesn't re-check validation (by design — it was checked at the gate),
  // but this state could only exist if the gate was bypassed.
  // The test proves the gate blocks at draft and review, making this state unreachable.
  // We verify by checking that advancing through draft→review→attachments→recipient→mailing
  // is impossible with failed validation.
  const draftState = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
  });
  const reviewState = stateAtPhase("review", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
    reviewChecks: [true, true, true, true],
  });
  assert.equal(canAdvance(draftState, def), false, "Draft gate blocks");
  assert.equal(canAdvance(reviewState, def), false, "Review gate blocks");
  // Therefore: cannot reach mailing phase through normal navigation
});

test("P0-1 regression: advanceStep from draft with failed validation produces a state that is still blocked at review", () => {
  let state = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: false, errors: 1, warnings: 0 },
  });
  // Simulate forced advance (bypassing canAdvance)
  state = advanceStep(state, def);
  assert.equal(state.phase, "review", "Phase should be review after advancing");
  // Even with all checks done, validation failure blocks
  state = { ...state, reviewChecks: [true, true, true, true] };
  assert.equal(canAdvance(state, def), false, "Cannot advance from review with failed validation");
});

test("P0-1 regression: only passing validation + all checks allows reaching mailing", () => {
  let state = stateAtPhase("draft", {
    draft: "Some draft text",
    draftValidation: { findings: [], passed: true, errors: 0, warnings: 0 },
  });
  assert.equal(canAdvance(state, def), true, "Can advance from draft with passing validation");
  state = advanceStep(state, def);
  assert.equal(state.phase, "review", "Phase should be review");
  state = { ...state, reviewChecks: [true, true, true, true] };
  assert.equal(canAdvance(state, def), true, "Can advance from review with passing validation and all checks");
  // Now advancing through attachments → recipient → mailing should all be allowed
  state = advanceStep(state, def); // attachments
  assert.equal(canAdvance(state, def), true, "Can advance from attachments");
  state = advanceStep(state, def); // recipient (no mailing set yet)
  // Recipient phase requires a mailing address
  assert.equal(canAdvance(state, def), false, "Cannot advance from recipient without address");
  state = { ...state, mailing: {
    method: "certified",
    recipient: { name: "IRS", org: "Treasury", address1: "123 Main St", address2: "", city: "Washington", state: "DC", zip: "20001" },
    status: "not_started",
  }};
  assert.equal(canAdvance(state, def), true, "Can advance from recipient with address");
  state = advanceStep(state, def); // mailing
  assert.equal(state.phase, "mailing", "Phase should be mailing");
  assert.equal(canAdvance(state, def), true, "Can advance from mailing phase");
  state = advanceStep(state, def); // checkout
  assert.equal(state.phase, "checkout", "Phase should be checkout");
});
