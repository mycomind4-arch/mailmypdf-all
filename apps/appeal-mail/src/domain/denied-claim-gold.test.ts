import { describe, expect, it } from "vitest";
import { constructWorkflow } from "./workflow-capabilities";
import { evaluateGoldStandardGate, REQUIRED_GOLD_CAPABILITIES } from "./gold-standard-gate";
import { getWorkflow } from "./workflows";
import "./workflow-packs";

describe("Denied Claim Gold Standard", () => {
  it("constructs a complete executable workflow", () => {
    const workflow = constructWorkflow(getWorkflow("denied-claim"));
    const gate = evaluateGoldStandardGate(workflow);
    expect(gate.passed).toBe(true);
    expect(gate.missingCapabilities).toEqual([]);
    expect(gate.missingPipelineSteps).toEqual([]);
    expect(workflow.qualityGate.documentRecognition).toBe(true);
    expect(workflow.qualityGate.deadlineVerification).toBe(true);
    expect(workflow.qualityGate.evidenceGrounding).toBe(true);
    expect(workflow.qualityGate.draftValidation).toBe(true);
    expect(workflow.qualityGate.submissionReadiness).toBe(true);
    expect(workflow.qualityGate.proofReady).toBe(true);
    for (const capability of REQUIRED_GOLD_CAPABILITIES) expect(workflow.capabilities).toContain(capability);
  });

  it("keeps the SEO contract on the transactional workflow", () => {
    const definition = getWorkflow("denied-claim");
    expect(definition.primaryKeyword).toBe("appeal denied claim");
    expect(definition.primaryMsv).toBeGreaterThan(0);
    expect(definition.primaryCpc).toBeGreaterThan(0);
    expect(definition.keywordIntent).toBe("transactional");
    expect(definition.experienceStages).toEqual(["understand", "build", "send"]);
  });
});
