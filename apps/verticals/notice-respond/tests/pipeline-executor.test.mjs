import assert from "node:assert/strict";
import test from "node:test";

import {
  runWorkflowPipeline,
} from "../src/domain/runtime/pipeline.ts";

import {
  createWorkflowContext,
  recordStage,
} from "../src/domain/runtime/types.ts";

import {
  getEnginePolicy,
} from "../src/domain/runtime/engine-dispatch.ts";

// ═══ Test fixtures ═══

const SYNTHETIC_NOTICE_TEXT = "CP2000 Notice Number 1234-56789 dated 2024-01-15. You have 30 days to respond.";

// Minimal workflow definition for testing
const testDefinition = {
  id: "test-synthetic",
  vertical: "test",
  engine: "document-action",
  title: "Test Workflow",
  description: "Synthetic test workflow",
  disclaimer: "test",
  searchIntent: { primary: "test", secondary: [], canonicalPath: "/test", informationalEntryPoints: [], actionIntents: [] },
  documents: [{ name: "test", identifiers: [], acceptedFormats: [], extractionFields: [] }],
  deadlines: [{ id: "test", label: "test", trigger: "test", sourcePriority: [] }],
  requirements: [{ id: "test", label: "test", type: "response", source: "test", required: true }],
  evidence: [{ id: "test", label: "test", purpose: "test", required: false, examples: [] }],
  analysis: { capabilities: [], orderedChecks: [], outputSections: [] },
  drafting: { requiredSections: ["test"], forbiddenBehavior: [], validationChecks: [] },
  submission: { methods: ["mail"], recipientRules: [], proofRequirements: [] },
  capabilities: [],
  qualityGate: {
    documentRecognition: true,
    factGrounding: true,
    deadlineVerification: true,
    requirementCoverage: true,
    evidenceGrounding: true,
    draftValidation: true,
    submissionReadiness: true,
    proofReady: true,
  },
};

const enginePolicy = getEnginePolicy("document-action");
assert.ok(enginePolicy, "document-action policy must exist");

// ── Full test pack with all capabilities ──
function makeFullTestPack() {
  return {
    workflowId: "test-synthetic",
    engine: "document-action",
    config: {},
    capabilities: {
      security: true,
      extraction: true,
      classification: true,
      deadline: true,
      discrepancy: true,
      evidence: true,
      research: true,
      strategy: true,
      draft: true,
      factualValidation: true,
      requirementValidation: true,
    },
    extract: (text) => ({
      noticeNumber: "1234-56789",
      noticeDate: "2024-01-15",
      responseDeadline: "2024-02-14",
      facts: [],
      warnings: [],
      classificationConfidence: 0.95,
    }),
    analyzeDiscrepancies: (ctx) => ({
      discrepancies: [
        { id: "d1", type: "amount_mismatch", description: "test mismatch", noticeValue: "$5000", userValue: "$3000", severity: "high", status: "unresolved", explanation: "test" },
      ],
      findings: [],
    }),
    buildEvidenceChecklist: (ctx) => ({
      items: [
        { id: "e1", label: "W-2", requirement: "required", state: "not_provided", description: "W-2 form", relatedDiscrepancyIds: ["d1"] },
      ],
      satisfied: 0,
      required: 1,
      provided: 0,
      missing: 1,
      allRequiredSatisfied: false,
    }),
    getResearchPack: () => ({
      sources: [
        { id: "s1", type: "government_website", title: "IRS.gov", url: "https://irs.gov", verificationStatus: "verified", verificationDate: "2024-01-01", topics: ["CP2000"] },
      ],
      knownFacts: [],
    }),
    generateStrategy: (ctx) => ({
      position: "disagree_some",
      rationale: "test rationale",
      recommendedActions: ["Gather W-2"],
      warnings: ["Deadline approaching"],
      confidence: "medium",
    }),
    generateDraft: (ctx) => "Dear IRS, I am responding to Notice CP2000 #1234-56789. I disagree with the proposed changes.",
    validateFactual: (ctx) => ({
      factualFindings: [
        { check: "notice_number_matches", passed: true, detail: "1234-56789 matches", severity: "info", validator: "factual" },
      ],
      requirementFindings: [],
      allFindings: [
        { check: "notice_number_matches", passed: true, detail: "1234-56789 matches", severity: "info", validator: "factual" },
      ],
      passed: true,
      errors: 0,
      warnings: 0,
      blocks: 0,
      blocked: false,
    }),
    validateRequirements: (ctx) => ({
      factualFindings: [],
      requirementFindings: [
        { check: "all_issues_addressed", passed: true, detail: "all issues addressed", severity: "info", validator: "requirement" },
      ],
      allFindings: [
        { check: "all_issues_addressed", passed: true, detail: "all issues addressed", severity: "info", validator: "requirement" },
      ],
      passed: true,
      errors: 0,
      warnings: 0,
      blocks: 0,
      blocked: false,
    }),
  };
}

// ── Minimal pack with no optional capabilities ──
function makeMinimalTestPack() {
  return {
    workflowId: "test-minimal",
    engine: "document-action",
    config: {},
    capabilities: {
      security: true,
      extraction: true,
      classification: true,
      deadline: false,
      discrepancy: false,
      evidence: false,
      research: false,
      strategy: false,
      draft: true,
      factualValidation: false,
      requirementValidation: false,
    },
    extract: (text) => ({
      noticeNumber: "TEST-001",
      noticeDate: null,
      responseDeadline: null,
      facts: [],
      warnings: [],
      classificationConfidence: 0.5,
    }),
    generateDraft: (ctx) => "Dear IRS, This is a response to notice TEST-001.",
  };
}

// ═══ Pipeline Execution Tests ═══

test("full pipeline with all capabilities executes all stages in order", () => {
  const pack = makeFullTestPack();
  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  // Pipeline should be ready (no blocks, no errors)
  assert.equal(result.ready, true, `Pipeline should be ready, errors: ${result.errors.join(", ")}`);

  // Check stage ordering
  const stageNames = result.stages.map(s => s.stage);
  assert.equal(stageNames[0], "security");
  assert.equal(stageNames[1], "classification");
  assert.equal(stageNames[2], "extraction");
  assert.equal(stageNames[3], "facts");

  // All implemented stages should have passed
  const passedStages = result.stages.filter(s => s.status === "passed");
  assert.ok(passedStages.length >= 10, `Expected 10+ passed stages, got ${passedStages.length}`);

  // Skipped stages (extension points)
  const skippedStages = result.stages.filter(s => s.status === "skipped");
  assert.ok(skippedStages.length >= 3, `Expected 3+ skipped stages, got ${skippedStages.length}`);

  // No NOT_SUPPORTED stages (pack implements everything)
  const notSupportedStages = result.stages.filter(s => s.status === "not_supported");
  assert.equal(notSupportedStages.length, 0, "Full pack should have no NOT_SUPPORTED stages");

  // Context should have all fields populated
  assert.ok(result.context.security);
  assert.ok(result.context.extraction);
  assert.ok(result.context.deadline);
  assert.ok(result.context.discrepancies.length > 0);
  assert.ok(result.context.evidence.length > 0);
  assert.ok(result.context.research);
  assert.ok(result.context.strategy);
  assert.ok(result.context.draft);
  assert.ok(result.context.draftProvenance);
  assert.ok(result.context.factualValidation);
  assert.ok(result.context.requirementValidation);
  assert.equal(result.context.blocked, false);
});

test("minimal pipeline with no optional capabilities marks them NOT_SUPPORTED", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-minimal" },
    pack,
    enginePolicy,
    input: { rawText: "Some notice text" },
  });

  assert.equal(result.ready, true, `Pipeline should be ready, errors: ${result.errors.join(", ")}`);

  // Optional stages should be NOT_SUPPORTED, not PASSED
  const notSupportedStages = result.stages.filter(s => s.status === "not_supported");
  assert.ok(notSupportedStages.length >= 7, `Expected 7+ NOT_SUPPORTED stages, got ${notSupportedStages.length}`);
  const notSupportedNames = notSupportedStages.map(s => s.stage);
  assert.ok(notSupportedNames.includes("deadline"));
  assert.ok(notSupportedNames.includes("discrepancy"));
  assert.ok(notSupportedNames.includes("evidence"));
  assert.ok(notSupportedNames.includes("research"));
  assert.ok(notSupportedNames.includes("strategy"));
  assert.ok(notSupportedNames.includes("factualValidation"));
  assert.ok(notSupportedNames.includes("requirementValidation"));

  // NOT_SUPPORTED is never PASSED
  for (const ns of notSupportedStages) {
    assert.notEqual(ns.status, "passed");
  }

  // Context should not have optional fields populated
  assert.equal(result.context.discrepancies.length, 0);
  assert.equal(result.context.evidence.length, 0);
  assert.equal(result.context.research, undefined);
  assert.equal(result.context.strategy, undefined);
  assert.equal(result.context.factualValidation, undefined);
  assert.equal(result.context.requirementValidation, undefined);
});

test("pipeline blocks when factual validation fails", () => {
  const pack = makeFullTestPack();
  pack.validateFactual = (ctx) => ({
    factualFindings: [
      { check: "notice_number_missing", passed: false, detail: "No notice number found in draft", severity: "error", validator: "factual" },
    ],
    requirementFindings: [],
    allFindings: [
      { check: "notice_number_missing", passed: false, detail: "No notice number found in draft", severity: "error", validator: "factual" },
    ],
    passed: false,
    errors: 1,
    warnings: 0,
    blocks: 0,
    blocked: false,
  });

  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  // Pipeline should NOT be ready — validation failed
  assert.equal(result.ready, false);
  assert.equal(result.context.blocked, true);
  assert.ok(result.context.blockReasons.some(r => r.includes("factual")), `Expected factual block reason, got: ${result.context.blockReasons.join(", ")}`);

  // Stages after blocking: consequential stages are BLOCKED (enforced, not skipped)
  // Only marker stages (provenance, analysis) are SKIPPED
  const blockingIdx = result.stages.findIndex(s => s.stage === "blocking");
  const stagesAfterBlocking = result.stages.slice(blockingIdx + 1);
  for (const s of stagesAfterBlocking) {
    if (["provenance", "analysis"].includes(s.stage)) {
      assert.equal(s.status, "skipped", `stage ${s.stage} should be skipped (marker), got ${s.status}`);
    } else {
      assert.equal(s.status, "blocked", `stage ${s.stage} should be blocked (consequential enforced), got ${s.status}`);
    }
  }
});

test("pipeline blocks when requirement validation has errors", () => {
  const pack = makeFullTestPack();
  pack.validateRequirements = (ctx) => ({
    factualFindings: [],
    requirementFindings: [
      { check: "missing_response_to_issue", passed: false, detail: "Did not address issue 2", severity: "error", validator: "requirement" },
    ],
    allFindings: [
      { check: "missing_response_to_issue", passed: false, detail: "Did not address issue 2", severity: "error", validator: "requirement" },
    ],
    passed: false,
    errors: 1,
    warnings: 0,
    blocks: 0,
    blocked: false,
  });

  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  assert.equal(result.ready, false);
  assert.equal(result.context.blocked, true);
  assert.ok(result.context.blockReasons.some(r => r.includes("requirement")), `Expected requirement block reason, got: ${result.context.blockReasons.join(", ")}`);
});

test("pipeline catches thrown exceptions and records as failed", () => {
  const pack = makeFullTestPack();
  pack.extract = () => {
    throw new Error("extraction crashed");
  };

  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  assert.equal(result.ready, false);
  // Extraction is a required stage that blocks on failure
  const extractionStage = result.stages.find(s => s.stage === "extraction");
  assert.equal(extractionStage.status, "failed");
  assert.ok(extractionStage.error.includes("extraction crashed"));

  // Subsequent stages should be blocked
  const factsStage = result.stages.find(s => s.stage === "facts");
  assert.equal(factsStage.status, "blocked");
});

test("pipeline never fabricates data for NOT_SUPPORTED stages", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-minimal" },
    pack,
    enginePolicy,
    input: { rawText: "Some notice" },
  });

  // No fabricated discrepancies
  assert.equal(result.context.discrepancies.length, 0);
  // No fabricated evidence
  assert.equal(result.context.evidence.length, 0);
  // No fabricated research
  assert.equal(result.context.research, undefined);
  // No fabricated strategy
  assert.equal(result.context.strategy, undefined);
  // No fabricated deadline (deadline capability is false)
  assert.equal(result.context.deadline, undefined);
  // No fabricated validation results
  assert.equal(result.context.factualValidation, undefined);
  assert.equal(result.context.requirementValidation, undefined);
});

test("pipeline BLOCK never becomes approval", () => {
  const pack = makeFullTestPack();
  pack.validateFactual = (ctx) => ({
    factualFindings: [
      { check: "critical_error", passed: false, detail: "Critical factual error", severity: "error", validator: "factual" },
    ],
    requirementFindings: [],
    allFindings: [
      { check: "critical_error", passed: false, detail: "Critical factual error", severity: "error", validator: "factual" },
    ],
    passed: false,
    errors: 1,
    warnings: 0,
    blocks: 1,
    blocked: true,
  });

  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  // Blocked must be true
  assert.equal(result.context.blocked, true);
  // Ready must be false
  assert.equal(result.ready, false);
  // BLOCK never becomes approval
  assert.ok(!result.ready, "Blocked pipeline must not be ready/approved");
});

test("pipeline stage execution order follows engine policy", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-order" },
    pack,
    enginePolicy,
    input: { rawText: "test" },
  });

  const stageOrder = result.stages.map(s => s.stage);
  const policyOrder = enginePolicy.stages.map(s => s.name);
  assert.deepEqual(stageOrder, policyOrder, "Stage order must match engine policy exactly");
});

test("pipeline preserves user facts and objective in context", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-user-input" },
    pack,
    enginePolicy,
    input: {
      rawText: "test",
      userFacts: "My income was $50,000",
      userObjective: "Dispute the balance due",
    },
  });

  assert.equal(result.context.input.userFacts, "My income was $50,000");
  assert.equal(result.context.input.userObjective, "Dispute the balance due");
});

test("pipeline security stage classifies input", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-security" },
    pack,
    enginePolicy,
    input: { rawText: "Normal IRS notice text with no injection" },
  });

  const securityStage = result.stages.find(s => s.stage === "security");
  assert.equal(securityStage.status, "passed");
  assert.ok(result.context.security);
  assert.ok(result.context.security.trustLevel);
});

test("pipeline classification stage classifies notice type", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-classification" },
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  const classificationStage = result.stages.find(s => s.stage === "classification");
  assert.equal(classificationStage.status, "passed");
  assert.ok(classificationStage.detail.includes("type="));
});

test("pipeline draft stage produces text", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-draft" },
    pack,
    enginePolicy,
    input: { rawText: "test" },
  });

  const draftStage = result.stages.find(s => s.stage === "draft");
  assert.equal(draftStage.status, "passed");
  assert.ok(result.context.draft);
  assert.ok(result.context.draft.length > 0);
});

test("pipeline draftProvenance stage builds provenance", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-provenance" },
    pack,
    enginePolicy,
    input: { rawText: "test" },
  });

  const provenanceStage = result.stages.find(s => s.stage === "draftProvenance");
  assert.equal(provenanceStage.status, "passed");
  assert.ok(result.context.draftProvenance);
  assert.ok(typeof result.context.draftProvenance.assertions !== "undefined");
});

test("pipeline blocking stage passes when no validation errors", () => {
  const pack = makeFullTestPack();
  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  const blockingStage = result.stages.find(s => s.stage === "blocking");
  assert.equal(blockingStage.status, "passed");
  assert.equal(result.context.blocked, false);
});

test("pipeline audit events track every stage", () => {
  const pack = makeMinimalTestPack();
  const result = runWorkflowPipeline({
    definition: { ...testDefinition, id: "test-audit" },
    pack,
    enginePolicy,
    input: { rawText: "test" },
  });

  // Every stage should have an audit event
  assert.equal(result.context.auditEvents.length, result.stages.length);
  for (const ae of result.context.auditEvents) {
    assert.ok(ae.stage);
    assert.ok(ae.timestamp);
    assert.ok(ae.message);
  }
});

test("unknown engine is rejected (no silent substitution)", () => {
  const pack = makeMinimalTestPack();
  // Try to run with undefined engine policy
  assert.throws(() => {
    runWorkflowPipeline({
      definition: testDefinition,
      pack,
      enginePolicy: undefined,
      input: { rawText: "test" },
    });
  }, /Cannot read|undefined|not a function|Cannot destructure|Cannot read properties of undefined/i);
});

test("pipeline with validation warnings (not errors) still passes", () => {
  const pack = makeFullTestPack();
  pack.validateFactual = (ctx) => ({
    factualFindings: [
      { check: "minor_issue", passed: false, detail: "Minor warning", severity: "warning", validator: "factual" },
    ],
    requirementFindings: [],
    allFindings: [
      { check: "minor_issue", passed: false, detail: "Minor warning", severity: "warning", validator: "factual" },
    ],
    passed: true, // warnings don't fail
    errors: 0,
    warnings: 1,
    blocks: 0,
    blocked: false,
  });

  const result = runWorkflowPipeline({
    definition: testDefinition,
    pack,
    enginePolicy,
    input: { rawText: SYNTHETIC_NOTICE_TEXT },
  });

  // Warnings don't block
  assert.equal(result.ready, true);
  assert.equal(result.context.blocked, false);
});
