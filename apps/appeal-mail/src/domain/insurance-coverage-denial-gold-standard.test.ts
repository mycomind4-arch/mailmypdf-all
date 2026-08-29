import { describe, expect, it } from "vitest";
import { getWorkflow } from "./workflows";

describe("insurance coverage denial gold standard", () => {
  it("declares the canonical customer experience and high-intent keyword", () => {
    const workflow = getWorkflow("insurance-coverage-denial");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("denial of insurance coverage letter");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.workflowPrompt).toContain("coverage denial");
  });
});