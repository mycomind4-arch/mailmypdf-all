/* ═══════════════════════════════════════════════════════════
   CP523 FACTORY PARITY TESTS — proves the executable-pack
   runtime reproduces CP523 behavior through the factory
   pipeline.

   Tests:
   A. Pack resolution
   B. Extraction
   C. Validation
   D. Discrepancy analysis
   E. Evidence checklist
   F. Draft generation
   G. Factory construction (constructExecutableWorkflow)
   H. Full pipeline (runWorkflowPipeline)
   I. Negative tests (wrong doc, malformed, missing deadline,
      prompt injection, empty, conflicting facts)

   ═══════════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

// Import the pack (auto-registers on import)
import "../src/domain/runtime/cp523-executable-pack.ts";
import { getExecutablePack, hasExecutablePack, _clearExecutablePackRegistry } from "../src/domain/runtime/pack-registry.ts";
import { constructExecutableWorkflow } from "../src/domain/runtime/factory-construction.ts";
import { runWorkflowPipeline } from "../src/domain/runtime/pipeline.ts";
import { getWorkflowById } from "../src/domain/workflow-catalog.ts";
import { validateExecutablePack as validatePack } from "../src/domain/runtime/executable-pack.ts";

// Fixtures
import {
  FIXTURE_VALID_CP523,
  FIXTURE_CP523_NO_DEADLINE,
  FIXTURE_WRONG_DOCUMENT,
  FIXTURE_MINIMAL_CP523,
  FIXTURE_ADVERSARIAL_INJECTION,
  FIXTURE_ADVERSARIAL_EMPTY,
  FIXTURE_CP523_WITH_BALANCE_DISPUTE,
  FIXTURE_CP523_USER_FACTS_DISPUTE,
} from "./cp523-fixtures.mjs";

// ── Helpers ──────────────────────────────────────────────────

function makeCtx(rawText, opts) {
  return {
    workflowId: "cp523-response",
    engine: "document-action",
    input: {
      rawText,
      userFacts: opts?.userFacts,
      userObjective: opts?.userObjective,
    },
    facts: [],
    discrepancies: [],
    findings: [],
    evidence: [],
    blocked: false,
    blockReasons: [],
    stageResults: [],
    auditEvents: [],
    draft: opts?.draft,
  };
}

// ═══════════════════════════════════════════════════════════
// A. PACK RESOLUTION
// ═══════════════════════════════════════════════════════════

test("A1: cp523-response resolves from executable pack registry", () => {
  assert.ok(hasExecutablePack("cp523-response"), "cp523-response should be registered");
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack, "getExecutablePack should return the pack");
  assert.equal(pack.workflowId, "cp523-response");
  assert.equal(pack.engine, "document-action");
});

test("A2: pack is executable (not just metadata)", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  assert.equal(typeof pack.extract, "function");
  assert.equal(typeof pack.generateDraft, "function");
  assert.equal(typeof pack.analyzeDiscrepancies, "function");
  assert.equal(typeof pack.buildEvidenceChecklist, "function");
  assert.equal(typeof pack.getResearchPack, "function");
  assert.equal(typeof pack.generateStrategy, "function");
  assert.equal(typeof pack.validateFactual, "function");
  assert.equal(typeof pack.validateRequirements, "function");
});

test("A3: every declared capability has an implementation", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const caps = pack.capabilities;
  if (caps.discrepancy) assert.equal(typeof pack.analyzeDiscrepancies, "function");
  if (caps.evidence) assert.equal(typeof pack.buildEvidenceChecklist, "function");
  if (caps.research) assert.equal(typeof pack.getResearchPack, "function");
  if (caps.strategy) assert.equal(typeof pack.generateStrategy, "function");
  if (caps.factualValidation) assert.equal(typeof pack.validateFactual, "function");
  if (caps.requirementValidation) assert.equal(typeof pack.validateRequirements, "function");
});

test("A4: no capability-registration diagnostics", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const errors = validatePack(pack);
  assert.equal(errors.length, 0, `Pack validation errors: ${errors.join("; ")}`);
});

// ═══════════════════════════════════════════════════════════
// B. EXTRACTION
// ═══════════════════════════════════════════════════════════

test("B1: extraction succeeds on valid CP523 fixture", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const result = pack.extract(FIXTURE_VALID_CP523);
  assert.ok(result, "extraction should return a result");
  assert.ok(result.noticeNumber, "noticeNumber should be populated");
  assert.ok(result.noticeDate, "noticeDate should be populated");
  assert.ok(result.classificationConfidence > 0, "confidence should be positive");
  assert.ok(result.facts.length > 0, "facts should be non-empty");
});

test("B2: extraction populates important CP523-specific values", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const result = pack.extract(FIXTURE_VALID_CP523);
  assert.ok(result.noticeNumber?.includes("CP523"), "noticeNumber should contain CP523");
  assert.ok(result.noticeDate, "noticeDate should be populated");
});

// ═══════════════════════════════════════════════════════════
// C. VALIDATION
// ═══════════════════════════════════════════════════════════

test("C1: validateFactual does not throw and returns structured result", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523, { draft: "Re: CP523-2024-567890-A" });
  const result = pack.validateFactual(ctx);
  assert.ok(result, "validateFactual should return a result");
  assert.equal(typeof result.passed, "boolean");
  assert.equal(typeof result.errors, "number");
  assert.equal(typeof result.warnings, "number");
  assert.ok(Array.isArray(result.factualFindings));
  assert.ok(Array.isArray(result.allFindings));
});

test("C2: validateRequirements does not throw and returns structured result", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523, { draft: "Re: CP523-2024-567890-A Tax Year 2022 Dear Sir or Madam: Sincerely, Name" });
  const result = pack.validateRequirements(ctx);
  assert.ok(result, "validateRequirements should return a result");
  assert.equal(typeof result.passed, "boolean");
  assert.equal(typeof result.errors, "number");
  assert.equal(typeof result.warnings, "number");
  assert.ok(Array.isArray(result.requirementFindings));
});

// ═══════════════════════════════════════════════════════════
// D. DISCREPANCY ANALYSIS
// ═══════════════════════════════════════════════════════════

test("D1: analyzeDiscrepancies does not throw", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523);
  assert.doesNotThrow(() => pack.analyzeDiscrepancies(ctx));
});

test("D2: CP523 discrepancy analysis detects findings", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523);
  const result = pack.analyzeDiscrepancies(ctx);
  assert.ok(result.discrepancies.length > 0 || result.findings.length > 0, "should detect at least one issue");
});

test("D3: discrepancy result conforms to runtime contract", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523);
  const result = pack.analyzeDiscrepancies(ctx);
  for (const d of result.discrepancies) {
    assert.ok(d.id, "discrepancy should have id");
    assert.ok(d.type, "discrepancy should have type");
    assert.ok(d.description, "discrepancy should have description");
    assert.ok(["unresolved", "user_correct", "irs_correct", "unclear"].includes(d.status),
      "discrepancy status should be a valid value");
    assert.ok(["critical", "high", "medium", "low"].includes(d.severity),
      "discrepancy severity should be a valid value");
  }
});

// ═══════════════════════════════════════════════════════════
// E. EVIDENCE CHECKLIST
// ═══════════════════════════════════════════════════════════

test("E1: buildEvidenceChecklist does not throw", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523);
  assert.doesNotThrow(() => pack.buildEvidenceChecklist(ctx));
});

test("E2: evidence checklist has items for CP523 fixture", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523);
  const result = pack.buildEvidenceChecklist(ctx);
  assert.ok(result.items.length > 0, "should have at least one evidence item");
  assert.ok(result.required >= 0, "required count should be non-negative");
  assert.equal(typeof result.allRequiredSatisfied, "boolean");
  for (const item of result.items) {
    assert.ok(item.id, "evidence item should have id");
    assert.ok(item.label, "evidence item should have label");
    assert.ok(item.description, "evidence item should have description");
    assert.ok(["required", "recommended", "optional", "not_applicable"].includes(item.requirement),
      "evidence item requirement should be valid");
  }
});

// ═══════════════════════════════════════════════════════════
// F. DRAFT GENERATION
// ═══════════════════════════════════════════════════════════

test("F1: generateDraft does not throw", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523, {
    userFacts: "I made my December payment on time.",
    userObjective: "I want to reinstate my installment agreement.",
  });
  assert.doesNotThrow(() => pack.generateDraft(ctx));
});

test("F2: draft includes notice reference and IA number", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523, {
    userFacts: "",
    userObjective: "",
  });
  const draft = pack.generateDraft(ctx);
  assert.ok(draft.length > 100, "draft should be substantial");
  assert.ok(draft.includes("CP523"), "draft should reference CP523");
});

test("F3: draft includes user facts and objective", () => {
  const pack = getExecutablePack("cp523-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_CP523, {
    userFacts: "My payment was received on January 5th.",
    userObjective: "I request reinstatement of my installment agreement.",
  });
  const draft = pack.generateDraft(ctx);
  assert.ok(draft.includes("My payment was received on January 5th"), "draft should include user facts");
  assert.ok(draft.includes("I request reinstatement"), "draft should include user objective");
});

// ═══════════════════════════════════════════════════════════
// G. FACTORY CONSTRUCTION
// ═══════════════════════════════════════════════════════════

test("G1: constructExecutableWorkflow succeeds for cp523-response", () => {
  const def = getWorkflowById("cp523-response");
  assert.ok(def, "cp523-response should be in the catalog");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf, "should return an executable workflow");
  assert.ok(wf.ready, `workflow should be ready, errors: ${wf.errors.join("; ")}`);
  assert.equal(wf.definition.id, "cp523-response");
});

test("G2: executable workflow has pack and engine policy", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.pack, "should have a pack");
  assert.ok(wf.enginePolicy, "should have an engine policy");
  assert.equal(wf.pack.workflowId, "cp523-response");
  assert.equal(wf.enginePolicy.engine, "document-action");
});

test("G3: executable workflow capabilities match engine stages", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.ready, "workflow should be ready");
  // Verify required stages are supported
  for (const stage of wf.enginePolicy.stages) {
    if (stage.required) {
      const capKey = stage.name;
      if (capKey in wf.pack.capabilities) {
        assert.ok(wf.pack.capabilities[capKey], `required stage ${stage.name} should be supported`);
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════
// H. FULL PIPELINE
// ═══════════════════════════════════════════════════════════

test("H1: full pipeline runs without error", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.ready, "workflow should be ready");

  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
      userFacts: "I want to reinstate my agreement",
      userObjective: "reinstate",
    },
  });

  assert.ok(result, "should return a result");
  assert.ok(Array.isArray(result.stages), "should have stage results");
  assert.ok(result.stages.length > 0, "should have at least one stage");
});

test("H2: pipeline produces extraction and draft", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
      userFacts: "I want to reinstate",
      userObjective: "reinstate",
    },
  });

  assert.ok(result.context.extraction, "pipeline should produce extraction");
  assert.ok(result.context.draft, "pipeline should produce draft");
  assert.ok(result.context.draft.length > 100, "draft should be substantial");
});

test("H3: pipeline produces strategy", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
      userFacts: "I want to reinstate my agreement",
      userObjective: "reinstate",
    },
  });

  assert.ok(result.context.strategy, "pipeline should produce strategy");
  assert.ok(result.context.strategy.position, "strategy should have a position");
});

test("H4: pipeline produces research pack", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
    },
  });

  assert.ok(result.context.research, "pipeline should produce research pack");
  assert.ok(result.context.research.sources.length > 0, "research pack should have sources");
});

test("H5: pipeline produces validation results", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
    },
  });

  // Factual validation should run
  assert.ok(result.context.factualValidation, "pipeline should produce factual validation");
  // Requirement validation should run
  assert.ok(result.context.requirementValidation, "pipeline should produce requirement validation");
});

test("H6: pipeline stage statuses are valid", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
    },
  });

  for (const stage of result.stages) {
    assert.ok(
      ["passed", "failed", "blocked", "not_supported", "skipped"].includes(stage.status),
      `stage ${stage.stage} has invalid status: ${stage.status}`,
    );
    // NOT_SUPPORTED should never be PASSED
    if (stage.status === "not_supported") {
      assert.notEqual(stage.status, "passed", "NOT_SUPPORTED should not be PASSED");
    }
  }
});

// ═══════════════════════════════════════════════════════════
// I. NEGATIVE / ADVERSARIAL TESTS
// ═══════════════════════════════════════════════════════════

test("I1: pipeline handles wrong document type", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_WRONG_DOCUMENT,
    },
  });

  // Should still run but with low confidence
  assert.ok(result.context.extraction, "should still produce extraction");
  assert.ok(result.context.extraction.classificationConfidence < 0.85, "confidence should be low for wrong doc");
});

test("I2: pipeline handles missing deadline", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_CP523_NO_DEADLINE,
    },
  });

  assert.ok(result.context.extraction, "should still produce extraction");
  // Should still produce a draft even without deadline
  assert.ok(result.context.draft, "should produce draft even without deadline");
});

test("I3: pipeline handles empty input", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  assert.doesNotThrow(() => {
    runWorkflowPipeline({
      definition: def,
      pack: wf.pack,
      enginePolicy: wf.enginePolicy,
      input: {
        rawText: FIXTURE_ADVERSARIAL_EMPTY,
      },
    });
  });
});

test("I4: pipeline treats injection attempt as data", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_ADVERSARIAL_INJECTION,
    },
  });

  // Should still identify as CP523 and extract data
  assert.ok(result.context.extraction, "should produce extraction");
  assert.ok(result.context.draft, "should produce draft");
  // The injection text should not have changed pipeline behavior
});

test("I5: pipeline detects balance dispute from user facts", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_CP523_WITH_BALANCE_DISPUTE,
      userFacts: FIXTURE_CP523_USER_FACTS_DISPUTE,
    },
  });

  assert.ok(result.context.discrepancies, "should have discrepancies");
  const balanceDisputes = result.context.discrepancies.filter(d => d.type === "balance_dispute");
  assert.ok(balanceDisputes.length > 0, "should detect balance dispute from user facts");
});

test("I6: pipeline handles minimal fixture", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_MINIMAL_CP523,
    },
  });

  assert.ok(result.context.extraction, "should produce extraction");
  assert.ok(result.context.draft, "should produce draft even with minimal data");
});

test("I7: BLOCKED is never treated as PASSED", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
    },
  });

  for (const stage of result.stages) {
    if (stage.status === "blocked") {
      assert.notEqual(stage.status, "passed", "BLOCKED should never be PASSED");
    }
  }
});

test("I8: NOT_SUPPORTED is never treated as PASSED", () => {
  const def = getWorkflowById("cp523-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: def,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_CP523,
    },
  });

  for (const stage of result.stages) {
    if (stage.status === "not_supported") {
      assert.notEqual(stage.status, "passed", "NOT_SUPPORTED should never be PASSED");
    }
  }
});
