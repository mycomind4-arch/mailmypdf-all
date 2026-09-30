import assert from "node:assert/strict";
import test from "node:test";

import {
  SSA_RECONSIDERATION_WORKFLOW_PROFILES,
} from "../src/domain-packs/appeal/ssa-reconsideration-profiles.js";
import {
  certifySsaReconsiderationFactoryArtifactForChat,
  getSsaReconsiderationFactoryArtifact,
} from "../src/domain-packs/appeal/ssa-reconsideration-factory-artifact.js";

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

test("every SSA reconsideration profile resolves one canonical factory artifact", () => {
  for (const profile of SSA_RECONSIDERATION_WORKFLOW_PROFILES) {
    const artifact = getSsaReconsiderationFactoryArtifact(profile.workflowId);
    assert.ok(artifact, profile.workflowId);
    assert.equal(artifact.factoryReady, true, profile.workflowId);
    assert.deepEqual(artifact.diagnostics, [], profile.workflowId);
    assert.equal(
      artifact.canonical.id,
      `appeal-mail/${profile.workflowId}`,
      profile.workflowId,
    );
    assert.equal(artifact.manifest.id, profile.workflowId);
    assert.equal(artifact.manifest.vertical, "appeal-mail");
    assert.equal(
      artifact.manifest.route,
      `/appeal-mail/workflows/${profile.workflowId}/start`,
    );
    assert.equal(artifact.startConfig.workflowId, profile.workflowId);
    assert.equal(artifact.startConfig.program, profile.program);
    assert.equal(artifact.startConfig.title, profile.title);
    assert.equal(
      artifact.startConfig.backHref,
      `/appeal-mail/workflows/${profile.workflowId}`,
    );

    const primary = artifact.manifest.documents?.find(
      (document) => document.role === "primary" && document.required,
    );
    assert.equal(primary?.id, profile.primaryDocumentId);
    assert.equal(primary?.extractionSchema, profile.extractionSchema);
    assert.ok(artifact.runtimePolicy.chatContract);
  }
});

test("SSA reconsideration factory artifacts certify against the connector tool surface", () => {
  for (const profile of SSA_RECONSIDERATION_WORKFLOW_PROFILES) {
    const artifact = getSsaReconsiderationFactoryArtifact(profile.workflowId);
    assert.ok(artifact);

    const result = certifySsaReconsiderationFactoryArtifactForChat(
      artifact,
      AVAILABLE_TOOLS,
    );

    assert.equal(result.executable, true, profile.workflowId);
    assert.equal(result.chatExecutable, true, profile.workflowId);
    assert.deepEqual(result.diagnostics, [], profile.workflowId);
    assert.deepEqual(result.chatReadiness.diagnostics, [], profile.workflowId);
    assert.ok(result.chatReadiness.requiredTools.includes("analyze_matter"));
    assert.ok(result.chatReadiness.requiredTools.includes("preview_packet"));
  }
});

test("SSA reconsideration chat certification fails closed without analysis", () => {
  const artifact = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");
  assert.ok(artifact);
  const tools = new Set(AVAILABLE_TOOLS);
  tools.delete("analyze_matter");

  const result = certifySsaReconsiderationFactoryArtifactForChat(
    artifact,
    tools,
  );
  assert.equal(result.executable, true);
  assert.equal(result.chatExecutable, false);
  assert.ok(
    result.chatReadiness.diagnostics.some(
      (item) =>
        item.code === "CONNECTOR_TOOL_MISSING" &&
        item.toolName === "analyze_matter",
    ),
  );
});

test("unknown SSA reconsideration workflow has no factory artifact", () => {
  assert.equal(
    getSsaReconsiderationFactoryArtifact("not-an-ssa-workflow"),
    null,
  );
});
