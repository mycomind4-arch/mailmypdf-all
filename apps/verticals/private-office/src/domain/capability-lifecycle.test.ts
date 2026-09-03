import { describe, expect, it } from "vitest";
import { capabilityGraph } from "./capability-graph";
import { businessWorkflowGroups } from "./workflow-groups";
import {
  applyCapabilityCompletion,
  CapabilityTransitionError,
} from "./capability-lifecycle";
import { createInitialState } from "./state-engine";

describe("capability lifecycle integration", () => {
  it("completing Create LLC reaches the LLC milestone and unlocks downstream groups", () => {
    const state = createInitialState("user-1");

    const result = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      state,
      {
        matterId: "matter-1",
        ownerId: "user-1",
        capabilityId: "form-llc",
      },
    );

    expect(result.state.completed).toContain("form-llc");
    expect(result.state.reachedMilestones).toContain("llc-established");
    expect(result.newlyUnlockedGroups.map((group) => group.id)).toEqual(
      expect.arrayContaining([
        "establish-business-identity",
        "financial-infrastructure",
        "legal-commercial-infrastructure",
        "licensing-compliance",
        "risk-infrastructure",
      ]),
    );
    expect(result.events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["capability_completed", "milestone_reached"]),
    );
  });

  it("rejects a first-time completion when prerequisites are not satisfied", () => {
    const state = createInitialState("user-1");

    expect(() =>
      applyCapabilityCompletion(
        capabilityGraph,
        businessWorkflowGroups,
        state,
        {
          matterId: "matter-1",
          ownerId: "user-1",
          capabilityId: "obtain-ein",
        },
      ),
    ).toThrow(CapabilityTransitionError);
  });

  it("is idempotent when the same completion is replayed", () => {
    const state = createInitialState("user-1");
    const first = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      state,
      { matterId: "matter-1", ownerId: "user-1", capabilityId: "form-llc" },
    );
    const second = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      first.state,
      { matterId: "matter-1", ownerId: "user-1", capabilityId: "form-llc" },
    );

    expect(second.state.completed).toEqual(first.state.completed);
    expect(second.state.reachedMilestones).toEqual(first.state.reachedMilestones);
    expect(second.newlyUnlockedGroups).toEqual([]);
    expect(second.events).toEqual([]);
  });

  it("emits group unlocks only when a group transitions from unavailable to available", () => {
    const state = createInitialState("user-1");
    const result = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      state,
      { matterId: "matter-1", ownerId: "user-1", capabilityId: "form-llc" },
    );

    const unlockedIds = result.events
      .filter((event) => event.eventType === "workflow_group_unlocked")
      .map((event) => event.metadata.groupId);

    expect(unlockedIds).toContain("establish-business-identity");
    expect(new Set(unlockedIds).size).toBe(unlockedIds.length);
  });
});
