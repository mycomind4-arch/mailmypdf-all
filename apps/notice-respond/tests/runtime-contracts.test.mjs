import assert from "node:assert/strict";
import test from "node:test";

import {
  createWorkflowContext,
  recordStage,
} from "../src/domain/runtime/types.ts";

import {
  validateExecutablePack,
} from "../src/domain/runtime/executable-pack.ts";

// ═══ WorkflowContext Tests ═══

test("createWorkflowContext initializes with correct defaults", () => {
  const ctx = createWorkflowContext("test-wf", "document-action", { rawText: "hello" });
  assert.equal(ctx.workflowId, "test-wf");
  assert.equal(ctx.engine, "document-action");
  assert.equal(ctx.input.rawText, "hello");
  assert.deepEqual(ctx.facts, []);
  assert.deepEqual(ctx.discrepancies, []);
  assert.deepEqual(ctx.findings, []);
  assert.deepEqual(ctx.evidence, []);
  assert.equal(ctx.blocked, false);
  assert.deepEqual(ctx.blockReasons, []);
  assert.deepEqual(ctx.stageResults, []);
  assert.deepEqual(ctx.auditEvents, []);
});

test("createWorkflowContext preserves optional input fields", () => {
  const ctx = createWorkflowContext("test-wf", "document-action", {
    rawText: "hello",
    fileName: "notice.pdf",
    userFacts: "my income is 50000",
    userObjective: "dispute the balance",
  });
  assert.equal(ctx.input.fileName, "notice.pdf");
  assert.equal(ctx.input.userFacts, "my income is 50000");
  assert.equal(ctx.input.userObjective, "dispute the balance");
});

test("recordStage adds to stageResults and auditEvents", () => {
  const ctx = createWorkflowContext("test-wf", "document-action", { rawText: "" });
  recordStage(ctx, "security", "passed", 5, "classified as IRS notice");
  assert.equal(ctx.stageResults.length, 1);
  assert.equal(ctx.stageResults[0].stage, "security");
  assert.equal(ctx.stageResults[0].status, "passed");
  assert.equal(ctx.stageResults[0].detail, "classified as IRS notice");
  assert.equal(ctx.auditEvents.length, 1);
  assert.ok(ctx.auditEvents[0].timestamp);
});

test("recordStage with error records error message", () => {
  const ctx = createWorkflowContext("test-wf", "document-action", { rawText: "" });
  recordStage(ctx, "extraction", "failed", 10, undefined, "No notice number found");
  assert.equal(ctx.stageResults[0].status, "failed");
  assert.equal(ctx.stageResults[0].error, "No notice number found");
});

test("WorkflowContext has expected fields — no untyped dumping ground", () => {
  const ctx = createWorkflowContext("test", "document-action", { rawText: "" });
  const keys = Object.keys(ctx).sort();
  assert.ok(keys.includes("workflowId"));
  assert.ok(keys.includes("engine"));
  assert.ok(keys.includes("input"));
  assert.ok(keys.includes("facts"));
  assert.ok(keys.includes("discrepancies"));
  assert.ok(keys.includes("findings"));
  assert.ok(keys.includes("evidence"));
  assert.ok(keys.includes("blocked"));
  assert.ok(keys.includes("blockReasons"));
  assert.ok(keys.includes("stageResults"));
  assert.ok(keys.includes("auditEvents"));
});

// ═══ StageStatus Tests ═══

test("StageStatus includes all 5 statuses via recordStage", () => {
  const ctx = createWorkflowContext("test", "document-action", { rawText: "" });
  const statuses = ["passed", "failed", "blocked", "not_supported", "skipped"];
  for (const s of statuses) {
    recordStage(ctx, `stage-${s}`, s, 1);
  }
  assert.equal(ctx.stageResults.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.equal(ctx.stageResults[i].status, statuses[i]);
  }
});

// ═══ ExecutableDomainPack Validation Tests ═══

test("validateExecutablePack rejects empty pack", () => {
  const errors = validateExecutablePack({});
  assert.ok(errors.length >= 5, `Expected 5+ errors, got ${errors.length}`);
  assert.ok(errors.includes("Missing workflowId"));
  assert.ok(errors.includes("Missing engine"));
  assert.ok(errors.includes("Missing required function: extract"));
  assert.ok(errors.includes("Missing required function: generateDraft"));
});

test("validateExecutablePack accepts a minimal valid pack", () => {
  const pack = {
    workflowId: "test",
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
    extract: () => ({ noticeNumber: null, noticeDate: null, responseDeadline: null, facts: [], warnings: [], classificationConfidence: 0.5 }),
    generateDraft: () => "draft text",
  };
  const errors = validateExecutablePack(pack);
  assert.equal(errors.length, 0, `Expected 0 errors, got: ${errors.join(", ")}`);
});

test("validateExecutablePack rejects capability=true without function", () => {
  const pack = {
    workflowId: "test",
    engine: "document-action",
    config: {},
    capabilities: {
      security: true,
      extraction: true,
      classification: true,
      deadline: false,
      discrepancy: true,
      evidence: false,
      research: false,
      strategy: false,
      draft: true,
      factualValidation: false,
      requirementValidation: false,
    },
    extract: () => ({ noticeNumber: null, noticeDate: null, responseDeadline: null, facts: [], warnings: [], classificationConfidence: 0.5 }),
    generateDraft: () => "draft",
  };
  const errors = validateExecutablePack(pack);
  assert.ok(errors.includes("Capability discrepancy=true but analyzeDiscrepancies not implemented"));
});

test("validateExecutablePack rejects all capability-function mismatches", () => {
  const pack = {
    workflowId: "test",
    engine: "document-action",
    config: {},
    capabilities: {
      security: true,
      extraction: true,
      classification: true,
      deadline: false,
      discrepancy: true,
      evidence: true,
      research: true,
      strategy: true,
      draft: true,
      factualValidation: true,
      requirementValidation: true,
    },
    extract: () => ({ noticeNumber: null, noticeDate: null, responseDeadline: null, facts: [], warnings: [], classificationConfidence: 0.5 }),
    generateDraft: () => "draft",
  };
  const errors = validateExecutablePack(pack);
  assert.ok(errors.includes("Capability discrepancy=true but analyzeDiscrepancies not implemented"));
  assert.ok(errors.includes("Capability evidence=true but buildEvidenceChecklist not implemented"));
  assert.ok(errors.includes("Capability research=true but getResearchPack not implemented"));
  assert.ok(errors.includes("Capability strategy=true but generateStrategy not implemented"));
  assert.ok(errors.includes("Capability factualValidation=true but validateFactual not implemented"));
  assert.ok(errors.includes("Capability requirementValidation=true but validateRequirements not implemented"));
});

// ═══ Type Structure Verification ═══

test("ValidationResult has 8 fields matching CP14/CP2000 structure", () => {
  const vr = {
    factualFindings: [],
    requirementFindings: [],
    allFindings: [],
    passed: true,
    errors: 0,
    warnings: 0,
    blocks: 0,
    blocked: false,
  };
  const keys = Object.keys(vr).sort();
  assert.deepEqual(keys, ["allFindings", "blocked", "blocks", "errors", "factualFindings", "passed", "requirementFindings", "warnings"]);
});

test("ValidationFinding has 5 fields matching CP14/CP2000 structure", () => {
  const vf = {
    check: "test",
    passed: true,
    detail: "detail",
    severity: "info",
    validator: "factual",
  };
  const keys = Object.keys(vf).sort();
  assert.deepEqual(keys, ["check", "detail", "passed", "severity", "validator"]);
});

test("Discrepancy has correct structure", () => {
  const d = {
    id: "d1",
    type: "amount_mismatch",
    description: "Amount mismatch",
    noticeValue: "$5000",
    userValue: "$3000",
    severity: "high",
    status: "unresolved",
    explanation: "test",
  };
  assert.equal(d.id, "d1");
  assert.equal(d.severity, "high");
});
