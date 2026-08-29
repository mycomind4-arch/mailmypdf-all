import { describe, expect, it } from "vitest";
import { getWorkflow, isWorkflowId } from "./workflows";

describe("social-security-denial workflow", () => {
  it("is registered with commercial intent and a specialized prompt", () => {
    const workflow = getWorkflow("social-security-denial");
    expect(workflow.primaryKeyword).toBe("social security denial appeal");
    expect(workflow.primaryMsv).toBeGreaterThan(0);
    expect(workflow.primaryCpc).toBeGreaterThan(0);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.workflowPrompt).toContain("Social Security");
  });

  it("keeps the workflow id addressable", () => {
    expect(isWorkflowId("social-security-denial")).toBe(true);
  });
});
