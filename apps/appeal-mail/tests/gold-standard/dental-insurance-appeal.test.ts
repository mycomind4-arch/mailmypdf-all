import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("dental-insurance-appeal gold standard", () => {
  it("declares the universal customer experience and keyword", () => {
    const workflow = getWorkflow("dental-insurance-appeal");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("dental insurance appeal letter");
    expect(workflow.primaryMsv).toBe(70);
  });

  it("uses the dental-specific workflow prompt", () => {
    const workflow = getWorkflow("dental-insurance-appeal");
    expect(workflow.workflowPrompt.toLowerCase()).toContain("dental insurance");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Dental claim", "Coverage", "Procedure", "Evidence"]));
  });
});
