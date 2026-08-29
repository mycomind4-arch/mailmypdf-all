import { describe, expect, it } from "vitest";
import { workflows } from "./workflows";

describe("SSDI denial workflow", () => {
  it("has the specialized workflow contract", () => {
    const workflow = workflows["ssdi-denial"];
    expect(workflow.primaryKeyword).toBe("denied ssdi");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.workflowPrompt).toMatch(/medical|disability|SSA/i);
  });

  it("never presents fabricated legal or medical authority as part of the workflow contract", () => {
    const workflow = workflows["ssdi-denial"];
    expect(workflow.workflowPrompt).toMatch(/do not|never|invent/i);
  });
});
