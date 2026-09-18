import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCompoundMatterOwner,
  completeCompoundPhase,
  createCompoundMatterState,
  getCompoundMatterStatus,
  getReadyCompoundPhaseIds,
  recordCompoundCapabilityRun,
  recordCompoundGateDecision,
  startCompoundPhase,
  type CompoundWorkflowDefinition,
} from "../src/compound-workflow.js";

const workflow: CompoundWorkflowDefinition = {
  id: "compound-test",
  title: "Compound Test",
  phases: [
    {
      id: "intake",
      title: "Intake",
      capabilities: ["facts"],
      dependsOn: [],
      gates: ["human-review"],
    },
    {
      id: "analysis",
      title: "Analysis",
      capabilities: ["evidence"],
      dependsOn: ["intake"],
      gates: ["evidence"],
    },
  ],
};

test("compound phases remain locked until dependencies complete", () => {
  let state = createCompoundMatterState({
    id: "matter-1",
    ownerId: "user-1",
    workflow,
    now: "2026-09-18T00:00:00Z",
  });

  assert.deepEqual(getReadyCompoundPhaseIds(state, workflow), ["intake"]);
  assert.throws(
    () => startCompoundPhase(state, workflow, "analysis"),
    /locked by incomplete dependencies/,
  );

  state = startCompoundPhase(state, workflow, "intake");
  state = recordCompoundGateDecision(state, workflow, {
    phaseId: "intake",
    gate: "human-review",
    status: "passed",
    verifiedBy: "user",
  });
  state = completeCompoundPhase(state, workflow, "intake");

  assert.deepEqual(getReadyCompoundPhaseIds(state, workflow), ["analysis"]);
});

test("compound phase cannot complete with unresolved or blocked gates", () => {
  let state = createCompoundMatterState({
    id: "matter-1",
    ownerId: "user-1",
    workflow,
  });
  state = startCompoundPhase(state, workflow, "intake");

  assert.equal(getCompoundMatterStatus(state), "awaiting_human_review");
  assert.throws(
    () => completeCompoundPhase(state, workflow, "intake"),
    /cannot complete until gates pass/,
  );

  state = recordCompoundGateDecision(state, workflow, {
    phaseId: "intake",
    gate: "human-review",
    status: "blocked",
    verifiedBy: "professional",
    detail: "Need outside review",
  });
  assert.equal(getCompoundMatterStatus(state), "blocked");
});

test("capability runs are only recorded for capabilities on an in-progress phase", () => {
  let state = createCompoundMatterState({
    id: "matter-1",
    ownerId: "user-1",
    workflow,
  });

  assert.throws(
    () =>
      recordCompoundCapabilityRun(state, workflow, {
        id: "run-1",
        phaseId: "intake",
        capabilityLabel: "facts",
        canonicalCapabilityId: "facts",
        adapterId: null,
        status: "completed",
        provider: "deterministic",
        provenance: "system_generated",
        output: {},
        messages: [],
        executedAt: "2026-09-18T00:00:00Z",
      }),
    /in progress/,
  );

  state = startCompoundPhase(state, workflow, "intake");
  state = recordCompoundCapabilityRun(state, workflow, {
    id: "run-1",
    phaseId: "intake",
    capabilityLabel: "facts",
    canonicalCapabilityId: "facts",
    adapterId: null,
    status: "completed",
    provider: "deterministic",
    provenance: "system_generated",
    output: { count: 2 },
    messages: [],
    executedAt: "2026-09-18T00:00:00Z",
  });

  assert.equal(state.capabilityRuns.length, 1);
  assert.throws(
    () =>
      recordCompoundCapabilityRun(state, workflow, {
        id: "run-2",
        phaseId: "intake",
        capabilityLabel: "unknown-capability",
        canonicalCapabilityId: "unknown",
        adapterId: null,
        status: "completed",
        provider: "deterministic",
        provenance: "system_generated",
        output: {},
        messages: [],
        executedAt: "2026-09-18T00:00:00Z",
      }),
    /not defined for phase/,
  );
});

test("compound matter ownership is explicit and fail-closed", () => {
  const state = createCompoundMatterState({
    id: "matter-1",
    ownerId: "user-1",
    workflow,
  });

  assert.doesNotThrow(() => assertCompoundMatterOwner(state, "user-1"));
  assert.throws(
    () => assertCompoundMatterOwner(state, "user-2"),
    /not accessible/,
  );
});
