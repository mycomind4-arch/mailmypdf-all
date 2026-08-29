import { describe, expect, it } from "vitest";
import { getWorkflow } from "./workflows";

describe("Financial Aid Appeal Gold workflow", () => {
  it("has the search-driven workflow contract", () => {
    const workflow = getWorkflow("financial-aid-appeal");
    expect(workflow.primaryKeyword).toBe("financial aid appeal letter");
    expect(workflow.primaryMsv).toBe(1000);
    expect(workflow.primaryCpc).toBeGreaterThan(10);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.workflowPrompt).toMatch(/financial aid/i);
  });

  it("is a distinct problem workflow, not a generic appeal alias", () => {
    expect(getWorkflow("financial-aid-appeal").id).toBe("financial-aid-appeal");
    expect(getWorkflow("financial-aid-appeal").title).toContain("Financial Aid");
  });
});
