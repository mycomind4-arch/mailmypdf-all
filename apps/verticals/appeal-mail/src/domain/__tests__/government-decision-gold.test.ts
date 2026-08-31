import { describe, expect, it } from "vitest";
import { getWorkflow } from "../workflows";

describe("government decision Gold workflow", () => {
  it("declares the standardized customer experience and document intake", () => {
    const workflow = getWorkflow("government-decision");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.steps).toContain("document");
    expect(workflow.steps).toContain("checkout");
    expect(workflow.steps).toContain("proof");
    expect(workflow.workflowPrompt).toMatch(/government decision/i);
  });
});
