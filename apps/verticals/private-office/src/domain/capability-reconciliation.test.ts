import { describe, expect, it } from "vitest";
import { capabilityGraph, validateGraph } from "./capability-graph";
import {
  completeCapability,
  createInitialState,
  getAvailableCapabilities,
} from "./state-engine";
import { findCapabilityForWorkflow } from "./workflow-capability";
import { planPath } from "./workflow-orchestrator";
import { applyCapabilityCompletion } from "./capability-lifecycle";
import { businessWorkflowGroups } from "./workflow-groups";
import { workflowProfiles } from "./workflow-profiles";
import { workflows } from "./workflows";

describe("standalone reconciliation: capability architecture", () => {
  it("restores a valid graph with debt validation mapped to the canonical workflow", () => {
    expect(validateGraph(capabilityGraph)).toEqual([]);
    expect(workflows["debt-validation-dispute"].lifecycle).toBe("gold");
    expect(workflowProfiles["debt-validation-dispute"].recipientRole).toBe("debt collector");
    expect(findCapabilityForWorkflow(capabilityGraph, "debt-validation-dispute")).toMatchObject({
      capabilityId: "debt-validation-dispute",
      workflowId: "debt-validation-dispute",
    });
  });

  it("starts from deterministic entry points and unlocks prerequisites in order", () => {
    const initial = createInitialState("user-1");
    const available = getAvailableCapabilities(capabilityGraph, initial).map((capability) => capability.id);
    expect(available).toContain("form-llc");
    expect(available).toContain("debt-validation-dispute");

    const path = planPath(capabilityGraph, initial, "obtain-business-credit");
    expect(path.path.indexOf("form-llc")).toBeLessThan(path.path.indexOf("obtain-ein"));
    expect(path.path.indexOf("obtain-ein")).toBeLessThan(path.path.indexOf("open-business-bank-account"));
    expect(path.path.at(-1)).toBe("obtain-business-credit");
  });

  it("reaches milestones only after their modeled capabilities are complete", () => {
    let state = createInitialState("user-2");
    state = completeCapability(capabilityGraph, state, "bank-wire-dispute").state;
    expect(state.reachedMilestones).not.toContain("financial-protection");

    const result = completeCapability(capabilityGraph, state, "debt-validation-dispute");
    expect(result.state.reachedMilestones).toContain("financial-protection");
    expect(result.newlyReachedMilestones.map((milestone) => milestone.id)).toContain(
      "financial-protection",
    );
  });

  it("makes authoritative lifecycle completion replay-safe", () => {
    const initial = createInitialState("user-3");
    const first = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      initial,
      {
        matterId: "matter-1",
        ownerId: "user-3",
        capabilityId: "debt-validation-dispute",
      },
    );
    expect(first.events.some((event) => event.eventType === "capability_completed")).toBe(true);

    const replay = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      first.state,
      {
        matterId: "matter-1",
        ownerId: "user-3",
        capabilityId: "debt-validation-dispute",
      },
    );
    expect(replay.events).toEqual([]);
    expect(replay.state.completed.filter((id) => id === "debt-validation-dispute")).toHaveLength(1);
  });
});
