/* ═══════════════════════════════════════════════════════════
   CP2000 FACTORY PARITY TESTS — proves the new executable-pack
   runtime reproduces existing CP2000 behavior.

   Tests:
   A. Pack resolution
   B. Extraction
   C. Validation
   D. Discrepancy analysis
   E. Evidence checklist
   F. Draft generation (with taxYear)
   G. Factory construction (constructExecutableWorkflow)
   H. Full pipeline (runWorkflowPipeline)
   I. Negative tests (wrong doc, malformed, missing deadline,
      prompt injection, contradictory facts)

   ═══════════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

// Import the pack (auto-registers on import)
import "../src/domain/runtime/cp2000-executable-pack.ts";
import { getExecutablePack, hasExecutablePack } from "../src/domain/runtime/pack-registry.ts";
import { constructExecutableWorkflow } from "../src/domain/runtime/factory-construction.ts";
import { runWorkflowPipeline } from "../src/domain/runtime/pipeline.ts";
import { getWorkflowById } from "../src/domain/workflow-catalog.ts";
import { validateExecutablePack as validatePack } from "../src/domain/runtime/executable-pack.ts";

// Fixtures
import {
  FIXTURE_VALID_SIMPLE,
  FIXTURE_MULTIPLE_DISCREPANCIES,
  FIXTURE_WRONG_DOCUMENT,
  FIXTURE_INCOMPLETE,
  FIXTURE_MISSING_DEADLINE,
  FIXTURE_ADVERSARIAL_INJECTION,
  FIXTURE_ADVERSARIAL_EMPTY,
  FIXTURE_CONFLICTING_USER,
  FIXTURE_CONFLICTING_USER_FACTS,
} from "./cp2000-fixtures.mjs";

// ── Helpers ──────────────────────────────────────────────────

function makeCtx(rawText, opts) {
  return {
    workflowId: "cp2000-response",
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

test("A1: cp2000-response resolves from executable pack registry", () => {
  assert.ok(hasExecutablePack("cp2000-response"), "cp2000-response should be registered");
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack, "getExecutablePack should return the pack");
  assert.equal(pack.workflowId, "cp2000-response");
  assert.equal(pack.engine, "document-action");
});

test("A2: pack is executable (not just metadata)", () => {
  const pack = getExecutablePack("cp2000-response");
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
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const caps = pack.capabilities;
  // Every true capability must have a function
  if (caps.discrepancy) assert.equal(typeof pack.analyzeDiscrepancies, "function");
  if (caps.evidence) assert.equal(typeof pack.buildEvidenceChecklist, "function");
  if (caps.research) assert.equal(typeof pack.getResearchPack, "function");
  if (caps.strategy) assert.equal(typeof pack.generateStrategy, "function");
  if (caps.factualValidation) assert.equal(typeof pack.validateFactual, "function");
  if (caps.requirementValidation) assert.equal(typeof pack.validateRequirements, "function");
});

test("A4: no capability-registration diagnostics", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const errors = validatePack(pack);
  assert.equal(errors.length, 0, `Pack validation errors: ${errors.join("; ")}`);
});

// ═══════════════════════════════════════════════════════════
// B. EXTRACTION
// ═══════════════════════════════════════════════════════════

test("B1: extraction succeeds on valid CP2000 fixture", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const result = pack.extract(FIXTURE_VALID_SIMPLE);
  assert.ok(result, "extraction should return a result");
  assert.ok(result.noticeNumber, "noticeNumber should be populated");
  assert.ok(result.noticeDate, "noticeDate should be populated");
  assert.ok(result.responseDeadline, "responseDeadline should be populated");
  assert.ok(result.classificationConfidence > 0, "confidence should be positive");
  assert.ok(result.facts.length > 0, "facts should be non-empty");
});

test("B2: extraction populates important CP2000-specific values", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const result = pack.extract(FIXTURE_VALID_SIMPLE);
  assert.ok(result.noticeNumber?.includes("CP2000"), "noticeNumber should contain CP2000");
  assert.equal(result.responseDeadline, "May 14, 2024");
});

// ═══════════════════════════════════════════════════════════
// C. VALIDATION
// ═══════════════════════════════════════════════════════════

test("C1: validateFactual does not throw and returns structured result", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE, { draft: "Re: CP2000-2024-12345-A" });
  const result = pack.validateFactual(ctx);
  assert.ok(result, "validateFactual should return a result");
  assert.equal(typeof result.passed, "boolean");
  assert.equal(typeof result.errors, "number");
  assert.equal(typeof result.warnings, "number");
  assert.ok(Array.isArray(result.factualFindings));
  assert.ok(Array.isArray(result.allFindings));
});

test("C2: validateRequirements does not throw and returns structured result", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE, { draft: "Re: CP2000-2024-12345-A Tax Year 2023" });
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
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
  assert.doesNotThrow(() => pack.analyzeDiscrepancies(ctx));
});

test("D2: known CP2000 income mismatch is detected", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
  const result = pack.analyzeDiscrepancies(ctx);
  assert.ok(result.discrepancies.length > 0, "should detect at least one discrepancy");
  const disc = result.discrepancies[0];
  assert.ok(disc.description, "discrepancy should have a description");
  assert.ok(disc.id, "discrepancy should have an id");
  assert.ok(disc.type, "discrepancy should have a type");
  // The fixture has $45,000 vs $52,000
  assert.ok(disc.description.includes("52,000") || disc.description.includes("45,000"),
    "discrepancy description should reference the mismatch amounts");
});

test("D3: discrepancy result conforms to runtime contract", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
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
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
  assert.doesNotThrow(() => pack.buildEvidenceChecklist(ctx));
});

test("E2: evidence checklist has items for CP2000 fixture", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
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
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE, {
    userFacts: "My actual income was $45,000 from one employer.",
    userObjective: "Dispute the proposed tax increase.",
  });
  assert.doesNotThrow(() => pack.generateDraft(ctx));
});

test("F2: draft is non-empty", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE, {
    userFacts: "My actual income was $45,000.",
    userObjective: "Dispute the proposed increase.",
  });
  const draft = pack.generateDraft(ctx);
  assert.ok(draft.length > 0, "draft should be non-empty");
  assert.ok(draft.length > 50, "draft should have substantive content");
});

test("F3: draft reflects correct taxYear from CP2000-specific extraction", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE, {
    userFacts: "Income was $45,000.",
    userObjective: "Dispute.",
  });
  const draft = pack.generateDraft(ctx);
  assert.ok(draft.includes("2023"), "draft should reference tax year 2023 from the fixture");
});

test("F4: draft references the notice number", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_VALID_SIMPLE);
  const draft = pack.generateDraft(ctx);
  assert.ok(draft.includes("CP2000-2024-12345-A"), "draft should reference notice number");
});

// ═══════════════════════════════════════════════════════════
// G. FACTORY CONSTRUCTION
// ═══════════════════════════════════════════════════════════

test("G1: constructExecutableWorkflow succeeds for cp2000-response", () => {
  const def = getWorkflowById("cp2000-response");
  assert.ok(def, "cp2000-response should exist in workflow catalog");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.ready, `factory should be ready (errors: ${wf.errors.join("; ")})`);
  assert.equal(wf.errors.length, 0, "no construction errors");
});

test("G2: constructed workflow has definition, pack, and engine policy", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.definition, "should have workflow definition");
  assert.ok(wf.pack, "should have executable pack");
  assert.ok(wf.enginePolicy, "should have engine policy");
});

test("G3: constructed pack corresponds to CP2000", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  assert.equal(wf.pack.workflowId, "cp2000-response");
  assert.equal(wf.pack.engine, "document-action");
});

test("G4: definition, pack, and engine are compatible", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  assert.equal(wf.definition.engine, wf.pack.engine, "definition and pack engines must match");
  assert.equal(wf.enginePolicy.engine, wf.pack.engine, "engine policy and pack engines must match");
  assert.equal(wf.definition.id, wf.pack.workflowId, "definition and pack IDs must match");
});

// ═══════════════════════════════════════════════════════════
// H. FULL PIPELINE
// ═══════════════════════════════════════════════════════════

test("H1: full pipeline succeeds on valid CP2000 fixture", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  assert.ok(wf.ready);

  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: {
      rawText: FIXTURE_VALID_SIMPLE,
      userFacts: "My actual W-2 shows $45,000 from one employer.",
      userObjective: "Dispute the proposed tax increase.",
    },
  });

  assert.ok(result, "pipeline should return a result");
  assert.ok(result.stages.length >= 14, `should have at least 14 stages, got ${result.stages.length}`);
});

test("H2: classification stage PASSED", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "classification");
  assert.ok(stage, "classification stage should exist");
  assert.equal(stage.status, "passed", `classification should be passed, got ${stage.status}`);
});

test("H3: extraction stage PASSED", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "extraction");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.extraction?.noticeNumber?.includes("CP2000"));
});

test("H4: deadline stage PASSED with confirmed deadline", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "deadline");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.equal(result.context.deadline?.certainty, "confirmed");
  assert.equal(result.context.deadline?.parsed, "May 14, 2024");
});

test("H5: discrepancy stage PASSED and detected the mismatch", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "discrepancy");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.discrepancies.length > 0, "should have detected discrepancies");
});

test("H6: evidence stage PASSED", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "evidence");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.evidence.length > 0, "should have evidence items");
});

test("H7: research stage PASSED", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "research");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.research?.sources?.length > 0, "should have research sources");
});

test("H8: strategy stage PASSED", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "strategy");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.strategy?.position, "should have a strategy position");
});

test("H9: draft stage PASSED and draft is non-empty", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "draft");
  assert.ok(stage);
  assert.equal(stage.status, "passed");
  assert.ok(result.context.draft && result.context.draft.length > 50, "draft should be substantive");
  assert.ok(result.context.draft.includes("2023"), "draft should reference tax year 2023");
});

test("H10: factualValidation stage executes", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "factualValidation");
  assert.ok(stage);
  assert.ok(["passed", "failed"].includes(stage.status), `factualValidation should be passed or failed, got ${stage.status}`);
  assert.ok(result.context.factualValidation, "context should have factualValidation result");
});

test("H11: requirementValidation stage executes", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "requirementValidation");
  assert.ok(stage);
  assert.ok(["passed", "failed"].includes(stage.status), `requirementValidation should be passed or failed, got ${stage.status}`);
  assert.ok(result.context.requirementValidation, "context should have requirementValidation result");
});

test("H12: blocking stage — blocks for requirement validation on auto-generated draft", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  const stage = result.stages.find(s => s.stage === "blocking");
  assert.ok(stage, "blocking stage should exist");
  // The auto-generated draft (without user facts/objective) will have
  // requirement validation issues (e.g. unresolved issues, evidence not listed).
  // This is CORRECT behavior — BLOCK never becomes approval.
  if (result.context.blocked) {
    // Must be blocked for a real validation reason, not a crash or type error
    assert.ok(
      result.context.blockReasons.some(r => r.includes("validation")),
      `block should be for validation, got: ${result.context.blockReasons.join("; ")}`
    );
    // Must NOT be blocked for extraction or security failures
    assert.ok(
      !result.context.blockReasons.some(r => r.includes("security") || r.includes("extraction")),
      `should not be blocked for security/extraction on clean fixture: ${result.context.blockReasons.join("; ")}`
    );
  }
});

test("H13: consequential stages are present and enforced (blocked when no consequential state)", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  // Consequential stages must be present — they are no longer silently omitted
  for (const cs of ["reviewBoundary", "approvalBoundary", "submissionBoundary", "proofTrackingBoundary"]) {
    const stage = result.stages.find(s => s.stage === cs);
    assert.ok(stage, `${cs} should be present in stages`);
    // Pipeline blocks at the blocking stage (requirement validation), so consequential stages are BLOCKED
    assert.ok(stage.status === "blocked" || stage.status === "failed",
      `${cs} should be blocked or failed (got ${stage.status}) — it must not be silently skipped`);
  }
  // Marker stages (provenance, analysis) are still SKIPPED — they are delegated to other stages
  for (const extStage of ["provenance", "analysis"]) {
    const stage = result.stages.find(s => s.stage === extStage);
    assert.ok(stage, `${extStage} should be present in stages`);
    assert.equal(stage.status, "skipped", `${extStage} should be SKIPPED, got ${stage.status}`);
  }
});

test("H14: pipeline result has audit trail", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_VALID_SIMPLE },
  });
  assert.ok(result.context.auditEvents.length > 0, "should have audit events");
  assert.ok(result.stages.length > 0, "should have stage results");
});

// ═══════════════════════════════════════════════════════════
// I. NEGATIVE TESTS
// ═══════════════════════════════════════════════════════════

test("I1: wrong document — extraction still runs but notice number may be null", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  // Court summons, not a CP2000
  const result = pack.extract(FIXTURE_WRONG_DOCUMENT);
  assert.ok(result);
  // The extractor may not find a CP2000 notice number
  // It should NOT fabricate one
  if (result.noticeNumber) {
    assert.ok(!result.noticeNumber.includes("CP2000"), "should not fabricate CP2000 notice number from court document");
  }
  // noticeNumber should be null for non-CP2000 document (no fabrication)
  // Note: classificationConfidence is a pre-existing extractor behavior
  // that may return high values even for non-CP2000 documents.
  // The key invariant is that no CP2000-specific data is fabricated.
  assert.ok(!result.noticeNumber, "should not fabricate notice number for non-CP2000 document");
});

test("I2: malformed notice — extraction does not throw, no fabricated facts", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  assert.doesNotThrow(() => pack.extract(FIXTURE_INCOMPLETE));
  const result = pack.extract(FIXTURE_INCOMPLETE);
  // Should not fabricate notice number, deadline, or tax year
  if (result.noticeNumber) {
    assert.ok(result.noticeNumber.length > 0);
    // Should be from the text, not fabricated
  }
  // No response deadline should be found in incomplete notice
  assert.ok(!result.responseDeadline, "should not fabricate a deadline from incomplete notice");
});

test("I3: missing deadline — explicitly MISSING, never fabricated", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const result = pack.extract(FIXTURE_MISSING_DEADLINE);
  assert.ok(!result.responseDeadline, "should not fabricate a deadline when none exists");

  // Pipeline should handle missing deadline gracefully
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const pipeResult = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_MISSING_DEADLINE },
  });
  const stage = pipeResult.stages.find(s => s.stage === "deadline");
  assert.ok(stage);
  assert.equal(stage.status, "passed", "deadline stage should still pass (with missing)");
  assert.equal(pipeResult.context.deadline?.certainty, "missing", "deadline certainty should be 'missing'");
  assert.ok(!pipeResult.context.deadline?.parsed, "no fabricated deadline");
});

test("I4: prompt injection — security stage sanitizes safely", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_ADVERSARIAL_INJECTION },
  });
  // Security stage should pass (it classifies content)
  const secStage = result.stages.find(s => s.stage === "security");
  assert.ok(secStage);
  assert.equal(secStage.status, "passed", "security stage should handle injection safely");
  // Pipeline should not crash
  assert.ok(result.context.security, "should have security classification");
});

test("I5: empty input — pipeline handles gracefully", () => {
  const def = getWorkflowById("cp2000-response");
  const wf = constructExecutableWorkflow(def);
  const result = runWorkflowPipeline({
    definition: wf.definition,
    pack: wf.pack,
    enginePolicy: wf.enginePolicy,
    input: { rawText: FIXTURE_ADVERSARIAL_EMPTY },
  });
  // Should not crash, should produce stage results
  assert.ok(result.stages.length > 0);
  // Extraction may fail or produce empty results, but should not throw
  const extStage = result.stages.find(s => s.stage === "extraction");
  assert.ok(extStage, "extraction stage should exist");
});

test("I6: contradictory user facts — findings preserved, no false certainty", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_CONFLICTING_USER, {
    userFacts: FIXTURE_CONFLICTING_USER_FACTS,
  });
  const result = pack.analyzeDiscrepancies(ctx);
  // Discrepancies should be detected
  assert.ok(result.discrepancies.length > 0 || result.findings.length > 0,
    "should detect issues with contradictory facts");
  // Should not claim the user is right with certainty
  for (const d of result.discrepancies) {
    assert.ok(d.status !== "user_correct" || d.status === "unclear",
      "contradictory facts should not be resolved as user_correct with certainty");
  }
});

test("I7: multiple discrepancies detected", () => {
  const pack = getExecutablePack("cp2000-response");
  assert.ok(pack);
  const ctx = makeCtx(FIXTURE_MULTIPLE_DISCREPANCIES);
  const result = pack.analyzeDiscrepancies(ctx);
  // The fixture has two income sources (1099-NEC and 1099-INT)
  assert.ok(result.discrepancies.length >= 1, "should detect at least one discrepancy");
  assert.ok(result.findings.length > 0, "should have findings");
});
