import { describe, expect, it } from "vitest";
import { getWorkflow } from "./workflows";

describe("life insurance denial gold workflow contract", () => {
  it("declares the shared customer experience and keyword intent", () => {
    const workflow = getWorkflow("life-insurance-denial");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.primaryKeyword).toBe("life insurance denial appeal letter");
    expect(workflow.workflowPrompt).toContain("life-insurance denial");
  });
});
