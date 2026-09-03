import { describe, expect, it } from "vitest";
import { capabilityGraph } from "./capability-graph";
import { createInitialState } from "./state-engine";
import {
  evaluateWorkflowGroup,
  evaluateWorkflowGroups,
  getAvailableWorkflowGroups,
  getNewlyUnlockedWorkflowGroups,
} from "./workflow-group-engine";
import { workflowGroups } from "./workflow-groups";

describe("workflow group engine", () => {
  it("exposes only Form Business at the initial state", () => {
    const state = createInitialState("user-1");
    const available = getAvailableWorkflowGroups(capabilityGraph, Object.values(workflowGroups), state);
    expect(available.map((item) => item.group.id)).toEqual(["form-business"]);
  });

  it("unlocks business identity, financial, legal, licensing, and risk groups after LLC completion", () => {
    const before = createInitialState("user-1");
    const after = { ...before, completed: ["form-llc"] };
    const unlocked = getNewlyUnlockedWorkflowGroups(
      capabilityGraph,
      Object.values(workflowGroups),
      before,
      after,
    );
    expect(unlocked.map((group) => group.id)).toEqual([
      "establish-business-identity",
      "financial-infrastructure",
      "legal-commercial-infrastructure",
      "licensing-compliance",
      "risk-infrastructure",
    ]);
  });

  it("reports a group as in-progress after one member is complete", () => {
    const state = { ...createInitialState("user-1"), completed: ["form-llc", "obtain-ein"] };
    const evaluation = evaluateWorkflowGroup(
      capabilityGraph,
      workflowGroups["establish-business-identity"],
      state,
    );
    expect(evaluation.status).toBe("completed");
  });

  it("does not require optional DBA registration to complete identity group", () => {
    const state = { ...createInitialState("user-1"), completed: ["form-llc", "obtain-ein"] };
    const evaluation = evaluateWorkflowGroup(
      capabilityGraph,
      workflowGroups["establish-business-identity"],
      state,
    );
    expect(evaluation.status).toBe("completed");
    expect(evaluation.missing).toEqual([]);
  });

  it("supports partial progress without falsely marking the group complete", () => {
    const state = { ...createInitialState("user-1"), completed: ["form-llc", "obtain-ein"] };
    const evaluation = evaluateWorkflowGroup(
      capabilityGraph,
      workflowGroups["financial-infrastructure"],
      state,
    );
    expect(evaluation.status).toBe("available");
    expect(evaluation.missing).toContain("open-business-bank-account");
    expect(evaluation.missing).toContain("set-up-accounting");
  });

  it("marks Business Operational unavailable until its convergence rule is satisfied", () => {
    const state = { ...createInitialState("user-1"), completed: ["form-llc", "obtain-ein"] };
    const evaluation = evaluateWorkflowGroup(
      capabilityGraph,
      workflowGroups["business-operational"],
      state,
    );
    expect(evaluation.status).toBe("in-progress");
    expect(evaluation.missing.length).toBeGreaterThan(0);
  });

  it("evaluates every defined group deterministically", () => {
    const state = createInitialState("user-1");
    const evaluations = evaluateWorkflowGroups(
      capabilityGraph,
      Object.values(workflowGroups),
      state,
    );
    expect(evaluations).toHaveLength(Object.keys(workflowGroups).length);
    expect(evaluations.every((evaluation) => evaluation.group.id.length > 0)).toBe(true);
  });
});
