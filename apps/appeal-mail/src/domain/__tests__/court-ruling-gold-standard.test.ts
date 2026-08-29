import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("court-ruling Gold Standard", () => {
  it("declares the three-stage experience and document upload", () => {
    const workflow = getWorkflow("court-ruling");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.workflowPrompt).toMatch(/court ruling|court|order/i);
  });

  it("uses the Court Ruling workflow identity", () => {
    expect(getWorkflow("court-ruling").id).toBe("court-ruling");
    expect(getWorkflow("court-ruling").title).toMatch(/court/i);
  });
});
