import { describe, expect, it } from "vitest";
import { getWorkflow } from "./workflows";

describe("Medicaid Denial gold workflow contract", () => {
  it("has the keyword, problem-specific intelligence, document intake, and three-stage UX", () => {
    const workflow = getWorkflow("medicaid-denial");
    expect(workflow.primaryKeyword).toBe("appeal medicaid denial");
    expect(workflow.primaryMsv).toBe(210);
    expect(workflow.primaryCpc).toBeCloseTo(12.434629);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.workflowPrompt).toContain("Medicaid");
    expect(workflow.focusAreas.length).toBeGreaterThanOrEqual(4);
  });
});
