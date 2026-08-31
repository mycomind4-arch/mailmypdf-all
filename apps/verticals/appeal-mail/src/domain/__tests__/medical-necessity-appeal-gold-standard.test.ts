import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("medical necessity appeal gold standard", () => {
  it("defines a complete customer workflow contract", () => {
    const workflow = getWorkflow("medical-necessity-appeal");
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.primaryKeyword).toBe("medical necessity appeal letter");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Medical necessity", "Clinical support", "Treatment", "Documentation"]));
  });

  it("keeps medical necessity prompting grounded and non-inventive", () => {
    const workflow = getWorkflow("medical-necessity-appeal");
    expect(workflow.workflowPrompt).toContain("medical-necessity criteria");
    expect(workflow.workflowPrompt).toContain("supporting clinical evidence");
  });
});
