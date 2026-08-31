import { describe, expect, it } from "vitest";
import { evaluateGoldStandardGate, getExecutableCapabilities, REQUIRED_GOLD_CAPABILITIES } from "./gold-standard-gate";
import type { ConstructedWorkflow, DomainPackSet, WorkflowDefinition } from "./workflow-capabilities";

const definition: WorkflowDefinition = {
  id: "government-decision",
  title: "Test appeal",
  description: "Test",
  disclaimer: "Test",
  steps: [
    "intro", "document", "xray", "decision", "timeline", "grounds", "evidence", "arguments",
    "stress-test", "draft", "final-stress-test", "readiness", "packet", "recipient", "mailing",
    "checkout", "proof", "submitted",
  ],
  stepLabels: Array(18).fill("Test"),
  focusAreas: ["test"],
  deadlineWarning: "test",
  decisionFields: [],
};

const completePacks: DomainPackSet = {
  engine: "appeal",
  document: { name: "doc", acceptedTypes: ["pdf"], classifierHints: ["appeal"], extractionSchema: ["date"], minConfidence: 0.8 },
  deadline: { name: "deadline", triggeringEvents: ["decision"], sourcePriority: ["notice"], jurisdictionDependent: true, computationRules: ["source-authoritative"] },
  evidence: { name: "evidence", evidenceTypes: ["document"], sufficiencyRules: ["linked"], contradictionRules: ["explicit"], missingEvidenceBehavior: "block" },
  analysis: {
    name: "analysis",
    capabilities: ["xray-analysis", "timeline-analysis", "stress-testing", "response-strategy"],
    orderedChecks: ["xray", "timeline", "stress"],
    riskFactors: ["deadline"],
    outputSections: ["findings"],
  },
  draft: { name: "draft", draftType: "appeal", requiredSections: ["grounds"], prohibitedUnsupportedClaims: ["outcome"], toneRules: ["factual"] },
  validation: { name: "validation", factualChecks: ["source"], requirementChecks: ["required"], unsupportedAssertionChecks: ["claim"], adversarialChecks: ["stress"] },
  submission: { name: "submission", methods: ["mail"], recipientRules: ["verified"], supportsMailing: true, supportsTracking: true, proofRequirements: ["provider"] },
};

const workflow = (packs: DomainPackSet | undefined): ConstructedWorkflow => ({
  definition,
  capabilities: packs ? [...REQUIRED_GOLD_CAPABILITIES] : [...REQUIRED_GOLD_CAPABILITIES],
  packs,
  qualityGate: {
    documentRecognition: Boolean(packs?.document),
    factGrounding: Boolean(packs?.document),
    deadlineVerification: Boolean(packs?.deadline),
    evidenceGrounding: Boolean(packs?.evidence),
    draftValidation: Boolean(packs?.validation),
    submissionReadiness: Boolean(packs?.submission && packs?.draft),
    proofReady: Boolean(packs?.submission),
  },
  lifecycle: packs ? "authority" : "functional",
  warnings: [],
  errors: [],
  ready: true,
});

describe("Appeal Mail Gold Standard gate", () => {
  it("does not trust default capability labels without packs", () => {
    const result = evaluateGoldStandardGate(workflow(undefined));
    expect(result.passed).toBe(false);
    expect(result.missingCapabilities.length).toBe(REQUIRED_GOLD_CAPABILITIES.length);
    expect(result.blockingReasons.join(" ")).toContain("Missing executable capabilities");
  });

  it("accepts complete concrete packs", () => {
    const executable = getExecutableCapabilities(workflow(completePacks));
    expect(REQUIRED_GOLD_CAPABILITIES.every((capability) => executable.has(capability))).toBe(true);
    const result = evaluateGoldStandardGate(workflow(completePacks));
    expect(result.passed).toBe(true);
    expect(result.missingCapabilities).toEqual([]);
  });

  it("requires specialized analysis declarations", () => {
    const partial = { ...completePacks, analysis: { ...completePacks.analysis, capabilities: [] } };
    const result = evaluateGoldStandardGate(workflow(partial));
    expect(result.passed).toBe(false);
    expect(result.missingCapabilities).toEqual(["xray-analysis", "timeline-analysis", "stress-testing", "response-strategy"]);
  });

  it("does not infer generic capabilities from an unrelated pack", () => {
    const partial: DomainPackSet = {
      ...completePacks,
      document: undefined as unknown as DomainPackSet["document"],
      deadline: undefined as unknown as DomainPackSet["deadline"],
      evidence: undefined as unknown as DomainPackSet["evidence"],
      draft: undefined as unknown as DomainPackSet["draft"],
      validation: undefined as unknown as DomainPackSet["validation"],
      analysis: { ...completePacks.analysis, capabilities: [] },
      submission: undefined as unknown as DomainPackSet["submission"],
    };
    const executable = getExecutableCapabilities(workflow(partial));
    expect(executable.size).toBe(0);
    const result = evaluateGoldStandardGate(workflow(partial));
    expect(result.passed).toBe(false);
    expect(result.missingCapabilities).toEqual([...REQUIRED_GOLD_CAPABILITIES]);
  });
});