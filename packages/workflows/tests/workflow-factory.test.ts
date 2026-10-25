import assert from "node:assert/strict";
import test from "node:test";
import { PIPELINES, pipelineIds } from "../src/pipeline-registry.js";
import { ADAPTERS } from "../src/adapter-registry.js";
import { composeWorkflow } from "../src/workflow-factory.js";
import type { WorkflowManifest } from "../src/workflow-manifest.js";

const base = (overrides: Partial<WorkflowManifest> = {}): WorkflowManifest => ({
  id: "test-workflow",
  vertical: "test",
  title: "Test Workflow",
  route: "/test/workflow",
  pipeline: "P02_OFFICIAL_RESPONSE",
  adapters: ["government"],
  requiredCapabilities: [
    "security", "classification", "extraction", "provenance", "deadlines",
    "findings", "requirements", "evidence", "strategy", "draft", "draftProvenance",
    "validation", "blockingGate", "humanReview", "mailing", "tracking", "proofAudit",
  ],
  optionalCapabilities: [],
  notApplicableCapabilities: [],
  maturity: "wired",
  primaryInput: "document",
  requiresHumanReview: true,
  allowsConsequentialAction: true,
  ...overrides,
});

test("registry exposes exactly eleven pipeline archetypes", () => {
  assert.equal(pipelineIds.length, 11);
  assert.deepEqual(new Set(pipelineIds).size, 11);
  assert.equal(PIPELINES.P11_SECURED_TRANSACTION.id, "P11_SECURED_TRANSACTION");
  assert.equal(ADAPTERS["secured-transactions"].id, "secured-transactions");
});

test("adapter registry is non-empty and stable", () => {
  assert.ok(Object.keys(ADAPTERS).length >= 15);
  for (const adapter of Object.values(ADAPTERS)) assert.ok(adapter.id && adapter.name);
});

test("valid manifest composes", () => {
  const result = composeWorkflow(base());
  assert.equal(result.executable, true);
  assert.equal(result.pipeline.id, "P02_OFFICIAL_RESPONSE");
  assert.deepEqual(result.diagnostics, []);
});

test("factory rejects incompatible adapter pairing", () => {
  const result = composeWorkflow(base({ adapters: ["insurance"] }));
  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some((d) => d.code === "INCOMPATIBLE_ADAPTER"));
});

test("factory rejects consequential workflows without human review", () => {
  const result = composeWorkflow(base({ requiresHumanReview: false }));
  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some((d) => d.code === "MISSING_HUMAN_REVIEW"));
});

test("P11 composes a workflow-specific capability subset with shared gates", () => {
  const selected = [
    "matterState", "findings", "requirements", "validation", "blockingGate", "humanReview",
  ] as const;
  const manifest = base({
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: selected,
    allowsConsequentialAction: false,
    primaryInput: "case",
  });
  const result = composeWorkflow(manifest);
  assert.equal(result.executable, true);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.pipeline.id, "P11_SECURED_TRANSACTION");
  for (const excluded of ["approval", "mailing", "tracking", "proofAudit"]) {
    assert.equal(manifest.requiredCapabilities.includes(excluded as any), false);
  }
});

test("P11 fails closed when findings, required basis, validation, gate or review is missing", () => {
  const required = [
    "matterState", "findings", "requirements", "validation", "blockingGate", "humanReview",
  ] as const;
  for (const missing of ["findings", "requirements", "validation", "blockingGate", "humanReview"] as const) {
    const result = composeWorkflow(base({
      pipeline: "P11_SECURED_TRANSACTION",
      adapters: ["secured-transactions"],
      requiredCapabilities: required.filter((capability) => capability !== missing),
      allowsConsequentialAction: false,
      primaryInput: "case",
    }));
    assert.equal(result.executable, false, `missing ${missing} must block composition`);
    assert.ok(result.diagnostics.some((d) =>
      d.code === "PIPELINE_CAPABILITY_UNDECLARED" && d.message.includes(missing),
    ), `missing ${missing} must produce an explicit pipeline diagnostic`);
  }
});

test("P11 rejects not-applicable declarations for mandatory stages", () => {
  const result = composeWorkflow(base({
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: ["matterState", "findings", "requirements", "validation", "humanReview"],
    notApplicableCapabilities: ["blockingGate"],
    allowsConsequentialAction: false,
    primaryInput: "case",
  }));
  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some((d) => d.code === "REQUIRED_STAGE_NOT_APPLICABLE"));
});

test("P11 permits explicit non-applicability for unrelated external effects", () => {
  const result = composeWorkflow(base({
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: ["matterState", "findings", "requirements", "validation", "blockingGate", "humanReview"],
    notApplicableCapabilities: ["approval", "mailing", "tracking"],
    allowsConsequentialAction: false,
    primaryInput: "case",
  }));
  assert.equal(result.executable, true);
  assert.deepEqual(result.diagnostics, []);
});

test("every pipeline declares a name and description", () => {
  for (const pipeline of Object.values(PIPELINES)) {
    assert.ok(pipeline.name.length > 0);
    assert.ok(pipeline.description.length > 0);
  }
});