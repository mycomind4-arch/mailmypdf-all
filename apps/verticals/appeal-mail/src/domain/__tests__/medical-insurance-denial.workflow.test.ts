import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("medical-insurance-denial workflow standard", () => {
  it("has the canonical customer experience and commercial intent", () => {
    const workflow = getWorkflow("medical-insurance-denial");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("medical appeal letter");
    expect(workflow.primaryMsv).toBe(90);
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Medical reason", "Coverage", "Records"]));
    expect(workflow.workflowPrompt).toMatch(/medical insurance denial/i);
  });
});
