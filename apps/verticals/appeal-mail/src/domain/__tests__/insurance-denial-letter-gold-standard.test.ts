import { describe, expect, it } from "vitest";
import { getWorkflow, isWorkflowId } from "@/domain/workflows";

describe("insurance-denial-letter gold standard", () => {
  it("is registered with the three-stage experience and Gemini intelligence", () => {
    const workflow = getWorkflow("insurance-denial-letter");
    expect(workflow.title).toBe("Respond to an Insurance Denial Letter");
    expect(workflow.primaryKeyword).toBe("insurance denial letter");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.workflowPrompt).toContain("insurance denial letter");
    expect(isWorkflowId("insurance-denial-letter")).toBe(true);
  });
});