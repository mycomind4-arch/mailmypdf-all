import { describe, expect, it } from "vitest";
import { getWorkflowPromptPack } from "./workflow-prompts";
import { workflows } from "./workflows";

describe("workflow prompt packs", () => {
  it("provides analysis, drafting, and validation prompts for every workflow", () => {
    for (const workflowId of Object.keys(workflows) as Array<keyof typeof workflows>) {
      const pack = getWorkflowPromptPack(workflowId);
      expect(pack.workflowId).toBe(workflowId);
      expect(pack.analysisSystemPrompt).toContain(workflowId);
      expect(pack.analysisSystemPrompt).toContain("Never invent");
      expect(pack.draftingSystemPrompt).toContain("Do not promise deletion");
      expect(pack.validationSystemPrompt).toContain("fail validation");
    }
  });
});
