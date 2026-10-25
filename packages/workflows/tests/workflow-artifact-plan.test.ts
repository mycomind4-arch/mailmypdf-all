import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_REGISTRY } from "../src/canonical-workflow-registry.js";
import {
  canonicalChatFactoryReport,
  canonicalWorkflowArtifactPlan,
  chatExecutionBindingFor,
} from "../src/chat-execution-registry.js";
import {
  WORKFLOW_ARTIFACT_PLAN_VERSION,
  workflowStartRegistryKey,
} from "../src/workflow-artifact-plan.js";

const tools = new Set([
  "create_matter", "get_workflow_state", "save_matter_input",
  "ingest_document", "get_document_status", "analyze_matter",
  "generate_draft", "save_draft", "preview_packet",
  "approve_packet", "prepare_checkout", "get_order_status",
]);

test("CP14 factory plan projects real identity, start files and review gates", () => {
  const plan = canonicalWorkflowArtifactPlan("cp14-response", tools);
  assert.ok(plan);
  assert.equal(plan.schemaVersion, WORKFLOW_ARTIFACT_PLAN_VERSION);
  assert.equal(plan.canonicalId, "notice-respond/cp14-response");
  assert.equal(plan.startRegistryKey, "notice-respond:cp14-response");
  assert.equal(plan.execution.kind, "platform");
  assert.equal(plan.execution.policyFamily, "notice-response");
  assert.equal(plan.public.startFile, "notice-respond/workflows/cp14-response/start/index.tsx");
  assert.equal(plan.workspace.startHref, "/dashboard/workflows/notice-respond/cp14-response/start");
  assert.ok(plan.manifest.documentIds.length > 0);
  assert.ok(plan.manifest.stepIds.length > 0);
  assert.ok(plan.manifest.gateIds.length > 0);
  assert.ok(plan.manifest.acceptanceScenarioIds.length > 0);
  assert.equal(plan.chat.certified, true);
  assert.ok(plan.chat.requiredTools.includes("approve_packet"));
});

test("only actually registered platform bindings receive artifact plans", () => {
  const report = canonicalChatFactoryReport(tools);
  assert.equal(report.length, WORKFLOW_REGISTRY.length);
  for (const item of report) {
    const id = item.id.split("/")[1];
    const bound = Boolean(chatExecutionBindingFor(id));
    assert.equal(Boolean(item.artifactPlan), bound, item.id);
    if (item.artifactPlan) {
      assert.equal(item.artifactPlan.canonicalId, item.id);
      assert.equal(item.artifactPlan.startRegistryKey, workflowStartRegistryKey(item.id.split("/")[0], item.id.split("/")[1]));
    }
  }
  assert.equal(canonicalWorkflowArtifactPlan("not-registered", tools), null);
  assert.equal(canonicalWorkflowArtifactPlan("secured-transaction-eligibility", tools), null);
});

test("missing approval tool blocks certification without inventing a runtime", () => {
  const missing = new Set(tools);
  missing.delete("approve_packet");
  const plan = canonicalWorkflowArtifactPlan("cp14-response", missing);
  assert.ok(plan);
  assert.equal(plan.chat.certified, false);
  assert.ok(plan.chat.diagnostics.some((diagnostic) => diagnostic.includes("CONNECTOR_TOOL_MISSING")));
});
