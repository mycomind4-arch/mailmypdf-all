import { describe, expect, it } from "vitest";
import { appealWorkflowCount, workflowExperienceStandard, workflowIds, workflows } from "./workflows";

describe("Appeal Mail workflow catalog", () => {
  it("contains all 33 current workflows", () => {
    expect(appealWorkflowCount).toBe(33);
    expect(workflowIds).toHaveLength(33);
  });

  it("gives every workflow the universal customer experience", () => {
    for (const workflow of Object.values(workflows)) {
      expect(workflow.experienceStages).toEqual(["understand", "build", "send"]);
      expect(workflow.acceptsDocuments).toBe(true);
      expect(workflow.workflowPrompt.length).toBeGreaterThan(40);
    }
  });

  it("defines marketing metadata for the newly prioritized workflows", () => {
    expect(workflows["insurance-claim-denial"].primaryKeyword).toBe("denial of insurance claim");
    expect(workflows["financial-aid-appeal"].primaryMsv).toBe(1000);
    expect(workflows["license-suspension-appeal"].primaryCpc).toBeCloseTo(27.394478);
    expect(workflowExperienceStandard.ai).toBe("Gemini");
    expect(workflowExperienceStandard.fulfillment).toBe("MailMyPDF");
  });
});
