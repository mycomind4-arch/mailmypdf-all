import { describe, expect, it } from "vitest";
import {
  completeCompoundPhase,
  createCompoundMatterState,
  getCompoundMatterStatus,
  getReadyCompoundPhaseIds,
  recordCompoundGateDecision,
  startCompoundPhase,
} from "./compound-workflow-runtime";
import { compoundWorkflows } from "./compound-workflows";

function passAllGates(
  state: ReturnType<typeof createCompoundMatterState>,
  phaseId: string,
) {
  const definition = compoundWorkflows[state.workflowId].phases.find(
    (phase) => phase.id === phaseId,
  );
  if (!definition) throw new Error("phase missing");

  return definition.gates.reduce(
    (next, gate) =>
      recordCompoundGateDecision(
        next,
        {
          phaseId,
          gate,
          status: "passed",
          verifiedBy: gate === "human-review" || gate === "consequential-action" ? "user" : "system",
        },
        "2026-09-10T20:00:00.000Z",
      ),
    state,
  );
}

describe("compound workflow runtime", () => {
  it("initializes only the root phase as ready", () => {
    const state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
      now: "2026-09-10T19:00:00.000Z",
    });

    expect(getReadyCompoundPhaseIds(state)).toEqual(["triage-authority"]);
    expect(getCompoundMatterStatus(state)).toBe("not_started");
  });

  it("does not permit starting a phase whose dependencies are incomplete", () => {
    const state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });

    expect(() => startCompoundPhase(state, "proof-elements")).toThrow(
      "locked by incomplete dependencies",
    );
  });

  it("blocks completion until every phase gate has passed", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });
    state = startCompoundPhase(state, "triage-authority");

    expect(() => completeCompoundPhase(state, "triage-authority")).toThrow(
      "cannot complete until gates pass",
    );
  });

  it("marks a phase blocked when a gate blocks", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });

    state = recordCompoundGateDecision(state, {
      phaseId: "triage-authority",
      gate: "counsel-escalation",
      status: "blocked",
      detail: "Active criminal accusation requires professional review.",
      verifiedBy: "system",
    });

    expect(
      state.phases.find((phase) => phase.phaseId === "triage-authority")?.status,
    ).toBe("blocked");
    expect(getCompoundMatterStatus(state)).toBe("blocked");
  });

  it("unlocks all branches whose shared prerequisite completes", () => {
    let state = createCompoundMatterState({
      id: "matter-1",
      ownerId: "owner-1",
      workflowId: "government-accusation-defense",
    });

    state = passAllGates(state, "triage-authority");
    state = completeCompoundPhase(state, "triage-authority");

    expect(getReadyCompoundPhaseIds(state)).toEqual([
      "proof-elements",
      "records-preservation",
    ]);
  });

  it("requires explicit final human and consequential-action gate decisions", () => {
    const workflow = compoundWorkflows["personal-legal-autonomy-asset-control"];
    const finalPhase = workflow.phases.at(-1);
    expect(finalPhase?.gates).toContain("human-review");
    expect(finalPhase?.gates).toContain("consequential-action");
  });
});
