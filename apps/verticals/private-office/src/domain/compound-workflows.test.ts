import { describe, expect, it } from "vitest";
import {
  compoundWorkflowList,
  compoundWorkflows,
  readyCompoundPhases,
  validateCompoundWorkflow,
} from "./compound-workflows";

describe("compound Private Office workflows", () => {
  it("registers the four flagship compound workflows", () => {
    expect(compoundWorkflowList).toHaveLength(4);
    expect(compoundWorkflows["government-accusation-defense"]).toBeDefined();
    expect(compoundWorkflows["property-estate-reconstruction"]).toBeDefined();
    expect(compoundWorkflows["government-accountability-investigation"]).toBeDefined();
    expect(compoundWorkflows["personal-legal-autonomy-asset-control"]).toBeDefined();
  });

  it("keeps every workflow behind human review and blocks automatic consequential action", () => {
    for (const workflow of compoundWorkflowList) {
      expect(workflow.requiresHumanReview).toBe(true);
      expect(workflow.allowsAutomaticConsequentialAction).toBe(false);
      expect(workflow.phases.at(-1)?.gates).toContain("human-review");
      expect(workflow.phases.at(-1)?.gates).toContain("consequential-action");
    }
  });

  it("defines valid forward-only workflow graphs", () => {
    for (const workflow of compoundWorkflowList) {
      expect(validateCompoundWorkflow(workflow)).toEqual([]);
    }
  });

  it("starts only root phases before dependencies are complete", () => {
    const workflow = compoundWorkflows["government-accusation-defense"];
    expect(readyCompoundPhases(workflow, []).map((phase) => phase.id)).toEqual([
      "triage-authority",
    ]);
  });

  it("unlocks dependent phases only after their prerequisites are complete", () => {
    const workflow = compoundWorkflows["government-accusation-defense"];
    const ready = readyCompoundPhases(workflow, ["triage-authority"]).map((phase) => phase.id);
    expect(ready).toContain("proof-elements");
    expect(ready).toContain("records-preservation");
    expect(ready).not.toContain("timeline-contradictions");
  });

  it("contains attorney escalation triggers in every compound workflow", () => {
    for (const workflow of compoundWorkflowList) {
      expect(workflow.attorneyEscalationTriggers.length).toBeGreaterThan(0);
    }
  });

  it("preserves proof and provenance concepts across all compound workflows", () => {
    for (const workflow of compoundWorkflowList) {
      const searchable = JSON.stringify(workflow).toLowerCase();
      expect(searchable).toMatch(/proof|provenance|source/);
    }
  });
});
