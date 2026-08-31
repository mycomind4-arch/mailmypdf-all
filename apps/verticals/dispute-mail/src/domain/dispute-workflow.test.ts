import { describe, expect, it } from "vitest";
import { runDisputeWorkflow } from "./dispute-workflow";
import { workflows } from "./workflows";

describe("canonical dispute workflow dispatcher", () => {
  it("dispatches every registered workflow through the profile engine", () => {
    for (const workflowId of Object.keys(workflows) as Array<keyof typeof workflows>) {
      const result = runDisputeWorkflow({
        workflowId,
        documentId: `${workflowId}-doc`,
        text: "Source document text for workflow testing.",
        facts: {},
        objective: "Investigate and resolve the stated dispute.",
      });
      expect(result.workflowId).toBe(workflowId);
      expect(result.analysis.classification.type).toBe(workflowId);
      expect(result.stages.map((stage) => stage.stage)).toContain("blocking-gates");
    }
  });
});
