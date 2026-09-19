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

test("every pipeline declares a name and description", () => {
  for (const pipeline of Object.values(PIPELINES)) {
    assert.ok(pipeline.name.length > 0);
    assert.ok(pipeline.description.length > 0);
  }
});

test("strict pipelines still reject an undeclared required capability", () => {
  const result = composeWorkflow(base({
    requiredCapabilities: base().requiredCapabilities.filter((capability) => capability !== "evidence"),
  }));
  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === "PIPELINE_CAPABILITY_UNDECLARED" &&
      diagnostic.message.includes("evidence"),
  ));
});

test("strict pipelines distinguish not-applicable from undeclared required capabilities", () => {
  const result = composeWorkflow(base({
    requiredCapabilities: base().requiredCapabilities.filter((capability) => capability !== "evidence"),
    notApplicableCapabilities: ["evidence"],
  }));
  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === "REQUIRED_STAGE_NOT_APPLICABLE" &&
      diagnostic.message.includes("evidence"),
  ));
  assert.equal(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "PIPELINE_CAPABILITY_UNDECLARED" &&
        diagnostic.message.includes("evidence"),
    ),
    false,
  );
});

test("P11 accepts a truthful capability subset for a composable secured-transaction subworkflow", () => {
  const result = composeWorkflow(base({
    id: "secured-transaction-eligibility",
    vertical: "secured-transactions",
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: ["matterState", "findings", "validation", "humanReview"],
    optionalCapabilities: [],
    notApplicableCapabilities: [],
    allowsConsequentialAction: false,
  }));

  assert.equal(result.executable, true);
  assert.deepEqual(result.diagnostics, []);
});

test("P11 still fails closed when a universal stage is undeclared", () => {
  const result = composeWorkflow(base({
    id: "secured-transaction-eligibility",
    vertical: "secured-transactions",
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: ["matterState", "findings", "humanReview"],
    optionalCapabilities: [],
    notApplicableCapabilities: [],
    allowsConsequentialAction: false,
  }));

  assert.equal(result.executable, false);
  assert.ok(result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === "PIPELINE_CAPABILITY_UNDECLARED" &&
      diagnostic.message.includes("validation"),
  ));
});

test("P11 permits non-universal stages to be explicitly not applicable", () => {
  const result = composeWorkflow(base({
    id: "secured-transaction-eligibility",
    vertical: "secured-transactions",
    pipeline: "P11_SECURED_TRANSACTION",
    adapters: ["secured-transactions"],
    requiredCapabilities: ["matterState", "findings", "validation", "humanReview"],
    optionalCapabilities: [],
    notApplicableCapabilities: ["approval", "mailing", "tracking"],
    allowsConsequentialAction: false,
  }));

  assert.equal(result.executable, true);
  assert.deepEqual(result.diagnostics, []);
});

