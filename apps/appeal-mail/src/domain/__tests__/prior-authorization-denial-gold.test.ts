import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("prior authorization denial gold workflow", () => {
  it("uses the standard customer experience and keyword contract", () => {
    const workflow = getWorkflow("prior-authorization-denial");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("appeal prior authorization denial");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Authorization", "Requested service", "Denial reason", "Clinical support"]));
  });
});
