import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("claim-denial-letter Gold workflow contract", () => {
  it("has a distinct high-value search intent and three-stage experience", () => {
    const workflow = getWorkflow("claim-denial-letter");
    expect(workflow.primaryKeyword).toBe("claim denial letter");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Denial reason", "Evidence"]));
  });

  it("requires the actual denial letter as the source document", () => {
    const workflow = getWorkflow("claim-denial-letter");
    expect(workflow.workflowPrompt).toContain("claim denial letter");
    expect(workflow.workflowPrompt).toContain("what is being denied");
  });
});
