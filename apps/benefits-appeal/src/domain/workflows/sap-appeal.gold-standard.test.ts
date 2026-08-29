import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("sap-appeal gold workflow contract", () => {
  it("declares the workflow and its primary keyword", () => {
    const workflow = getWorkflow("sap-appeal");
    expect(workflow.id).toBe("sap-appeal");
    expect(workflow.primaryKeyword).toMatch(/sap appeal/i);
    expect(workflow.workflowPrompt).toBeTruthy();
    expect(workflow.focusAreas.length).toBeGreaterThan(0);
  });
});
