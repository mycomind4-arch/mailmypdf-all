import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("financial aid reinstatement Gold workflow", () => {
  it("has the three-stage experience and workflow metadata", () => {
    const workflow = getWorkflow("financial-aid-reinstatement");
    expect(workflow.id).toBe("financial-aid-reinstatement");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toContain("financial aid reinstatement");
    expect(workflow.focusAreas).toContain("Recovery plan");
  });
});
