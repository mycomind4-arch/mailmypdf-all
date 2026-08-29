import { describe, expect, it } from "vitest";
import { getWorkflow } from "./workflows";

describe("insurance claim denial workflow", () => {
  it("is a document-first transactional workflow with the Gold customer stages", () => {
    const workflow = getWorkflow("insurance-claim-denial");
    expect(workflow.primaryKeyword).toBe("denial of insurance claim");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.workflowPrompt).toContain("insurance denial");
    expect(workflow.focusAreas.length).toBeGreaterThanOrEqual(4);
  });
});
