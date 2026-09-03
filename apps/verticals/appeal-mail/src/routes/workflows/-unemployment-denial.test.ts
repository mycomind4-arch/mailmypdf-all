import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("Unemployment Denial Gold workflow", () => {
  it("has the workflow-specific commercial profile", () => {
    const workflow = getWorkflow("unemployment-denial");
    expect(workflow.primaryKeyword).toBe("unemployment insurance appeal");
    expect(workflow.primaryMsv).toBe(260);
    expect(workflow.primaryCpc).toBe(1.391115);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.workflowPrompt).toContain("unemployment");
  });
});
