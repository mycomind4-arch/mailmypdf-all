import assert from "node:assert/strict";
import test from "node:test";

import {
  registerExecutablePack,
  getExecutablePack,
  hasExecutablePack,
  listExecutablePacks,
  registrySize,
  _clearExecutablePackRegistry,
} from "../src/domain/runtime/pack-registry.ts";

import {
  getEnginePolicy,
  isEngineImplemented,
  listImplementedEngines,
  isStageRequired,
  stageBlocksOnFailure,
  getStageDef,
} from "../src/domain/runtime/engine-dispatch.ts";

// ═══ Pack Registry Tests ═══

// Helper to create a valid minimal pack.
// Only sets capabilities that don't require executable functions.
// Pass extra capability booleans that have NO matching function.
function makePack(workflowId, extraCaps = {}) {
  return {
    workflowId,
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
      ...extraCaps,
    },
    extract: () => ({ noticeNumber: null, noticeDate: null, responseDeadline: null, facts: [], warnings: [], classificationConfidence: 0.5 }),
    generateDraft: () => "draft",
  };
}

// Helper for a full pack with all capabilities AND all executable functions
function makeFullPack(workflowId) {
  return {
    workflowId,
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
    extract: () => ({ noticeNumber: null, noticeDate: null, responseDeadline: null, facts: [], warnings: [], classificationConfidence: 0.5 }),
    generateDraft: () => "draft",
    analyzeDiscrepancies: () => ({ discrepancies: [], findings: [] }),
    buildEvidenceChecklist: () => ({ items: [], satisfied: 0, required: 0, provided: 0, missing: 0, allRequiredSatisfied: true }),
    getResearchPack: () => ({ sources: [], knownFacts: [] }),
    generateStrategy: () => ({ position: "test", rationale: "test", recommendedActions: [], warnings: [], confidence: "high" }),
    validateFactual: () => ({ factualFindings: [], requirementFindings: [], allFindings: [], passed: true, errors: 0, warnings: 0, blocks: 0, blocked: false }),
    validateRequirements: () => ({ factualFindings: [], requirementFindings: [], allFindings: [], passed: true, errors: 0, warnings: 0, blocks: 0, blocked: false }),
  };
}

// Helper for a pack with specific capabilities + their functions
function makePackWithFns(workflowId, caps = {}) {
  const pack = makePack(workflowId, caps);
  if (caps.discrepancy) pack.analyzeDiscrepancies = () => ({ discrepancies: [], findings: [] });
  if (caps.evidence) pack.buildEvidenceChecklist = () => ({ items: [], satisfied: 0, required: 0, provided: 0, missing: 0, allRequiredSatisfied: true });
  if (caps.research) pack.getResearchPack = () => ({ sources: [], knownFacts: [] });
  if (caps.strategy) pack.generateStrategy = () => ({ position: "test", rationale: "test", recommendedActions: [], warnings: [], confidence: "high" });
  if (caps.factualValidation) pack.validateFactual = () => ({ factualFindings: [], requirementFindings: [], allFindings: [], passed: true, errors: 0, warnings: 0, blocks: 0, blocked: false });
  if (caps.requirementValidation) pack.validateRequirements = () => ({ factualFindings: [], requirementFindings: [], allFindings: [], passed: true, errors: 0, warnings: 0, blocks: 0, blocked: false });
  return pack;
}

test("registerExecutablePack stores and retrieves a pack", () => {
  _clearExecutablePackRegistry();
  registerExecutablePack(makePack("test-register"));
  assert.ok(hasExecutablePack("test-register"));
  const pack = getExecutablePack("test-register");
  assert.equal(pack.workflowId, "test-register");
  _clearExecutablePackRegistry();
});

test("registerExecutablePack rejects duplicate registration", () => {
  _clearExecutablePackRegistry();
  registerExecutablePack(makePack("test-dup"));
  assert.throws(() => {
    registerExecutablePack(makePack("test-dup"));
  }, /Duplicate executable pack registration/);
  _clearExecutablePackRegistry();
});

test("registerExecutablePack rejects invalid pack", () => {
  _clearExecutablePackRegistry();
  assert.throws(() => {
    registerExecutablePack({ workflowId: "bad", engine: "document-action", config: {}, capabilities: {}, extract: null, generateDraft: null });
  }, /Invalid executable pack/);
  _clearExecutablePackRegistry();
});

test("getExecutablePack returns undefined for unregistered workflow", () => {
  _clearExecutablePackRegistry();
  assert.equal(getExecutablePack("nonexistent"), undefined);
  assert.equal(hasExecutablePack("nonexistent"), false);
});

test("listExecutablePacks returns diagnostics for all registered packs", () => {
  _clearExecutablePackRegistry();
  // Use capabilities that don't require functions (deadline, research=false)
  registerExecutablePack(makePack("test-1", { deadline: true }));
  // Use a pack with functions for the second
  registerExecutablePack(makePackWithFns("test-2", { research: true }));
  const diagnostics = listExecutablePacks();
  assert.equal(diagnostics.length, 2);
  const d1 = diagnostics.find((d) => d.workflowId === "test-1");
  assert.ok(d1);
  assert.equal(d1.capabilities.deadline, true);
  assert.equal(d1.capabilities.discrepancy, false);
  assert.equal(d1.capabilities.research, false);
  const d2 = diagnostics.find((d) => d.workflowId === "test-2");
  assert.ok(d2);
  assert.equal(d2.capabilities.research, true);
  assert.equal(d2.capabilities.discrepancy, false);
  _clearExecutablePackRegistry();
});

test("registrySize returns correct count", () => {
  _clearExecutablePackRegistry();
  assert.equal(registrySize(), 0);
  registerExecutablePack(makePack("count-1"));
  assert.equal(registrySize(), 1);
  registerExecutablePack(makePack("count-2"));
  assert.equal(registrySize(), 2);
  _clearExecutablePackRegistry();
  assert.equal(registrySize(), 0);
});

test("full pack with all capabilities registers successfully", () => {
  _clearExecutablePackRegistry();
  registerExecutablePack(makeFullPack("test-full"));
  const pack = getExecutablePack("test-full");
  assert.ok(pack);
  assert.equal(pack.capabilities.discrepancy, true);
  assert.equal(pack.capabilities.evidence, true);
  assert.equal(pack.capabilities.research, true);
  assert.equal(pack.capabilities.strategy, true);
  assert.equal(pack.capabilities.factualValidation, true);
  assert.equal(pack.capabilities.requirementValidation, true);
  _clearExecutablePackRegistry();
});

// ═══ Contract Enforcement Regression Tests ═══

test("REGRESSION: declaring discrepancy=true without analyzeDiscrepancies fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-discrepancy", { discrepancy: true });
  // No analyzeDiscrepancies function provided
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability discrepancy=true but analyzeDiscrepancies not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: declaring evidence=true without buildEvidenceChecklist fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-evidence", { evidence: true });
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability evidence=true but buildEvidenceChecklist not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: declaring research=true without getResearchPack fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-research", { research: true });
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability research=true but getResearchPack not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: declaring strategy=true without generateStrategy fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-strategy", { strategy: true });
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability strategy=true but generateStrategy not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: declaring factualValidation=true without validateFactual fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-factual", { factualValidation: true });
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability factualValidation=true but validateFactual not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: declaring requirementValidation=true without validateRequirements fails registration", () => {
  _clearExecutablePackRegistry();
  const badPack = makePack("bad-requirement", { requirementValidation: true });
  assert.throws(
    () => registerExecutablePack(badPack),
    /Capability requirementValidation=true but validateRequirements not implemented/
  );
  _clearExecutablePackRegistry();
});

test("REGRESSION: deadline capability does not require a function (extracted from extraction)", () => {
  _clearExecutablePackRegistry();
  // deadline=true is fine without a function — deadline info comes from extraction
  registerExecutablePack(makePack("ok-deadline", { deadline: true }));
  assert.ok(hasExecutablePack("ok-deadline"));
  _clearExecutablePackRegistry();
});

test("REGRESSION: pack with functions but capability=false registers (function ignored)", () => {
  _clearExecutablePackRegistry();
  // Having the function but capability=false is fine — function just won't be called
  const pack = makePack("ok-extra-fn", { discrepancy: false });
  pack.analyzeDiscrepancies = () => ({ discrepancies: [], findings: [] });
  registerExecutablePack(pack);
  assert.ok(hasExecutablePack("ok-extra-fn"));
  _clearExecutablePackRegistry();
});

// ═══ Engine Dispatch Tests ═══

test("document-action engine policy exists", () => {
  const policy = getEnginePolicy("document-action");
  assert.ok(policy);
  assert.equal(policy.engine, "document-action");
  assert.ok(policy.stages.length >= 14, `Expected 14+ stages, got ${policy.stages.length}`);
});

test("isEngineImplemented returns true for document-action", () => {
  assert.equal(isEngineImplemented("document-action"), true);
});

test("isEngineImplemented returns false for unimplemented engines", () => {
  assert.equal(isEngineImplemented("dispute"), false);
  assert.equal(isEngineImplemented("records"), false);
  assert.equal(isEngineImplemented("appeal"), false);
  assert.equal(isEngineImplemented("jurisdictional"), false);
});

test("listImplementedEngines returns only document-action", () => {
  const engines = listImplementedEngines();
  assert.deepEqual(engines, ["document-action"]);
});

test("getEnginePolicy returns undefined for unknown engine", () => {
  assert.equal(getEnginePolicy("dispute"), undefined);
  assert.equal(getEnginePolicy("nonexistent"), undefined);
});

test("document-action policy has required stages in correct order", () => {
  const policy = getEnginePolicy("document-action");
  const stageNames = policy.stages.map((s) => s.name);
  assert.equal(stageNames[0], "security");
  assert.equal(stageNames[1], "classification");
  assert.equal(stageNames[2], "extraction");
  assert.equal(stageNames[3], "facts");
  assert.ok(stageNames.includes("deadline"));
  assert.ok(stageNames.includes("discrepancy"));
  assert.ok(stageNames.includes("evidence"));
  assert.ok(stageNames.includes("research"));
  assert.ok(stageNames.includes("strategy"));
  assert.ok(stageNames.includes("draft"));
  assert.ok(stageNames.includes("blocking"));
});

test("security is required and blocks on failure", () => {
  const policy = getEnginePolicy("document-action");
  assert.equal(isStageRequired(policy, "security"), true);
  assert.equal(stageBlocksOnFailure(policy, "security"), true);
});

test("draft is required and blocks on failure", () => {
  const policy = getEnginePolicy("document-action");
  assert.equal(isStageRequired(policy, "draft"), true);
  assert.equal(stageBlocksOnFailure(policy, "draft"), true);
});

test("discrepancy is optional and does not block on failure", () => {
  const policy = getEnginePolicy("document-action");
  assert.equal(isStageRequired(policy, "discrepancy"), false);
  assert.equal(stageBlocksOnFailure(policy, "discrepancy"), false);
});

test("blocking is required", () => {
  const policy = getEnginePolicy("document-action");
  assert.equal(isStageRequired(policy, "blocking"), true);
});

test("getStageDef returns undefined for unknown stage", () => {
  const policy = getEnginePolicy("document-action");
  assert.equal(getStageDef(policy, "nonexistent"), undefined);
});

// ═══ Engine Extensibility Tests ═══

test("engine dispatch has extension points for 5 engines", () => {
  // document-action is implemented, the rest are not yet
  assert.equal(isEngineImplemented("document-action"), true);
  assert.equal(isEngineImplemented("dispute"), false);
  assert.equal(isEngineImplemented("appeal"), false);
  assert.equal(isEngineImplemented("records"), false);
  assert.equal(isEngineImplemented("jurisdictional"), false);
  // The extension point is the ENGINE_POLICIES record — adding a new
  // engine policy there makes it available. No code changes needed
  // in the pipeline executor — it just looks up the policy.
});
