import assert from "node:assert/strict";
import test from "node:test";

import {
  RECORDS_REQUEST_WORKFLOW_PROFILES,
  certifyRecordsRequestFactoryArtifactForChat,
  getRecordsRequestFactoryArtifact,
} from "../src/domain-packs/records-request/index.js";

const AVAILABLE_TOOLS = new Set([
  "create_matter",
  "get_workflow_state",
  "save_matter_input",
  "ingest_document",
  "get_document_status",
  "analyze_matter",
  "generate_draft",
  "save_draft",
  "preview_packet",
  "approve_packet",
  "prepare_checkout",
  "get_order_status",
]);

test("every Records Request profile resolves one factory artifact", () => {
  for (const profile of RECORDS_REQUEST_WORKFLOW_PROFILES) {
    const artifact = getRecordsRequestFactoryArtifact(profile.workflowId);
    assert.ok(artifact, profile.workflowId);
    assert.equal(artifact.factoryReady, true, profile.workflowId);
    assert.deepEqual(artifact.diagnostics, [], profile.workflowId);
    assert.equal(
      artifact.canonical.id,
      `records-request/${profile.workflowId}`,
      profile.workflowId,
    );
    assert.equal(artifact.manifest.id, profile.workflowId);
    assert.equal(artifact.manifest.vertical, "records-request");
    assert.equal(
      artifact.manifest.route,
      `/records-request/workflows/${profile.workflowId}/start`,
    );
    assert.equal(artifact.startConfig.workflowId, profile.workflowId);
    assert.equal(artifact.startConfig.title, profile.title);
    assert.equal(
      artifact.startConfig.backHref,
      `/records-request/workflows/${profile.workflowId}`,
    );
    assert.equal(
      artifact.startConfig.recordsSoughtPlaceholder,
      profile.recordsSoughtPlaceholder,
    );
    assert.ok(artifact.runtimePolicy.chatContract);
  }
});

test("Records Request factory artifacts certify against the connector tool surface", () => {
  for (const profile of RECORDS_REQUEST_WORKFLOW_PROFILES) {
    const artifact = getRecordsRequestFactoryArtifact(profile.workflowId);
    assert.ok(artifact);

    const result = certifyRecordsRequestFactoryArtifactForChat(
      artifact,
      AVAILABLE_TOOLS,
    );
    assert.equal(result.executable, true, profile.workflowId);
    assert.equal(result.chatExecutable, true, profile.workflowId);
    assert.deepEqual(result.diagnostics, [], profile.workflowId);
    assert.deepEqual(result.chatReadiness.diagnostics, [], profile.workflowId);
    assert.equal(result.chatReadiness.requiredTools.includes("analyze_matter"), false);
    assert.ok(result.chatReadiness.requiredTools.includes("save_matter_input"));
  }
});

test("Records Request factory chat certification fails closed without packet preview", () => {
  const artifact = getRecordsRequestFactoryArtifact("public-records-request");
  assert.ok(artifact);
  const tools = new Set(AVAILABLE_TOOLS);
  tools.delete("preview_packet");

  const result = certifyRecordsRequestFactoryArtifactForChat(artifact, tools);
  assert.equal(result.executable, true);
  assert.equal(result.chatExecutable, false);
  assert.ok(
    result.chatReadiness.diagnostics.some(
      (item) =>
        item.code === "CONNECTOR_TOOL_MISSING" &&
        item.toolName === "preview_packet",
    ),
  );
});

test("unknown Records Request workflow has no factory artifact", () => {
  assert.equal(getRecordsRequestFactoryArtifact("not-a-records-workflow"), null);
});
