import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("financial-aid-suspension-appeal Gold workflow", () => {
  it("declares the Gold experience and document/AI contract", () => {
    const workflow = getWorkflow("financial-aid-suspension-appeal");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("financial aid suspension appeal letter sample");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Suspension reason", "Academic record", "Circumstances", "Recovery plan"]));
    expect(workflow.workflowPrompt).toContain("financial aid suspension");
  });
});
