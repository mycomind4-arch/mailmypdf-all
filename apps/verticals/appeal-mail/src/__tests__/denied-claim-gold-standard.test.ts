import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";

describe("denied-claim Gold Standard", () => {
  it("declares the complete customer journey and executable workflow contract", () => {
    const workflow = getWorkflow("denied-claim");

    expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
    expect(workflow.acceptsDocuments).toBe(true);
    expect(workflow.keywordIntent).toBe("transactional");
    expect(workflow.primaryKeyword).toBe("appeal denied claim");
    expect(workflow.primaryMsv).toBe(480);
    expect(workflow.primaryCpc).toBe(8.5);
    expect(workflow.steps).toContain("xray");
    expect(workflow.steps).toContain("timeline");
    expect(workflow.steps).toContain("evidence");
    expect(workflow.steps).toContain("stress-test");
    expect(workflow.steps).toContain("final-stress-test");
    expect(workflow.steps).toContain("readiness");
    expect(workflow.steps).toContain("packet");
    expect(workflow.steps).toContain("proof");
    expect(workflow.focusAreas).toEqual(expect.arrayContaining([
      "Denial reason",
      "Policy or claim reference",
      "Decision date",
      "Response deadline",
      "Claim facts",
      "Supporting records",
      "Evidence gaps",
      "Recipient / appeal instructions",
    ]));
    expect(workflow.workflowPrompt).toContain("Do not invent policy terms");
    expect(workflow.workflowPrompt).toContain("source facts from user-supplied facts and unknowns");
    expect(workflow.workflowPrompt).toContain("human approval");
    expect(workflow.workflowPrompt).toContain("tracking -> proof");
  });
});
