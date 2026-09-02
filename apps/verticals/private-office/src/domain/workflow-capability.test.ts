import { describe, expect, it } from "vitest";
import { capabilityGraph } from "./capability-graph";
import { createInitialState } from "./state-engine";
import {
  findCapabilityForWorkflow,
  getMissingWorkflowCapabilityPrerequisites,
} from "./workflow-capability";

describe("workflow capability mapping", () => {
  it("resolves an executable workflow to its canonical capability", () => {
    const match = findCapabilityForWorkflow(capabilityGraph, "form-llc");

    expect(match).not.toBeNull();
    expect(match?.capabilityId).toBe("form-llc");
    expect(match?.workflowId).toBe("form-llc");
  });

  it("returns null for workflows not represented in the capability graph", () => {
    expect(
      findCapabilityForWorkflow(capabilityGraph, "unknown-workflow"),
    ).toBeNull();
  });

  it("returns unmet prerequisites for a mapped workflow", () => {
    const state = createInitialState("user-1");

    const missing = getMissingWorkflowCapabilityPrerequisites(
      capabilityGraph,
      state,
      "obtain-ein",
    );

    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain("form-llc");
  });

  it("returns no missing prerequisites after required capabilities are complete", () => {
    const state = {
      ...createInitialState("user-1"),
      completed: ["form-llc"],
    };

    expect(
      getMissingWorkflowCapabilityPrerequisites(
        capabilityGraph,
        state,
        "obtain-ein",
      ),
    ).toEqual([]);
  });
});
