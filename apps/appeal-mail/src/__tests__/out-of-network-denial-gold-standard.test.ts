import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("out-of-network-denial Gold Standard", () => {
  it("declares the canonical customer experience and keyword intent", () => {
    const workflow = getWorkflow("out-of-network-denial");
    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.primaryKeyword).toBe("appeal letter to insurance company for out of network");
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining(["Network status", "Plan terms", "Exception basis"]));
  });
});
