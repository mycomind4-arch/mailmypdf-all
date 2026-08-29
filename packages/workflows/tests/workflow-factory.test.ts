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

test("registry exposes exactly ten pipeline archetypes", () => {
  assert.equal(pipelineIds.length, 10);
  assert.deepEqual(new Set(pipelineIds).size, 10);
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
