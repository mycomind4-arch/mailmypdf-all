import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("car insurance appeal workflow certification", () => {
  it("uses the Gold customer experience and transaction metadata", () => {
    const workflow = getWorkflow("car-insurance-appeal");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("car insurance appeal letter");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.workflowPrompt).toContain("auto claim");
  });
});
