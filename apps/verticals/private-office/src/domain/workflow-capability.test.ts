import { describe, expect, it } from "vitest";
import type { CapabilityGraph } from "./capability-graph";
import { createInitialState } from "./state-engine";
import {
  findCapabilityForWorkflow,
  getMissingWorkflowCapabilityPrerequisites,
} from "./workflow-capability";

describe("workflow capability mapping", () => {
  const graph: CapabilityGraph = {
    capabilities: {
      "collect-evidence": { id: "collect-evidence", title: "Collect evidence", description: "", vertical: "private-office", family: "test", prerequisites: [], unlocks: [] },
      "prepare-dispute": { id: "prepare-dispute", title: "Prepare dispute", description: "", vertical: "private-office", family: "test", workflowId: "contractor-dispute", prerequisites: ["collect-evidence"], unlocks: [] },
    },
    milestones: {},
    entryPoints: ["collect-evidence"],
  };

  it("resolves an executable workflow to its canonical capability", () => {
    const match = findCapabilityForWorkflow(graph, "contractor-dispute");

    expect(match).not.toBeNull();
    expect(match?.capabilityId).toBe("prepare-dispute");
    expect(match?.workflowId).toBe("contractor-dispute");
  });

  it("returns null for workflows not represented in the capability graph", () => {
    expect(
      findCapabilityForWorkflow(graph, "unknown-workflow"),
    ).toBeNull();
  });

  it("returns unmet prerequisites for a mapped workflow", () => {
    const state = createInitialState("user-1");

    const missing = getMissingWorkflowCapabilityPrerequisites(
      graph,
      state,
      "contractor-dispute",
    );

    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain("collect-evidence");
  });

  it("returns no missing prerequisites after required capabilities are complete", () => {
    const state = {
      ...createInitialState("user-1"),
      completed: ["collect-evidence"],
    };

    expect(
      getMissingWorkflowCapabilityPrerequisites(
        graph,
        state,
        "contractor-dispute",
      ),
    ).toEqual([]);
  });
});
