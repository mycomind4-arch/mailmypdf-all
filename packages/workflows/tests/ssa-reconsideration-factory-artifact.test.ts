import assert from "node:assert/strict";
import test from "node:test";

import {
  SSA_RECONSIDERATION_WORKFLOW_PROFILES,
  certifySsaReconsiderationFactoryArtifactForChat,
  getSsaReconsiderationFactoryArtifact,
} from "../src/index.js";

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

test("SSDI and SSI resolve one canonical reconsideration factory artifact", () => {
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
    assert.equal(artifact.startConfig.program, profile.program);
    assert.equal(artifact.startConfig.title, profile.title);
    assert.equal(
      artifact.startConfig.backHref,
      `/appeal-mail/workflows/${profile.workflowId}`,
    );
    assert.ok(artifact.runtimePolicy.chatContract);

    const primary = artifact.manifest.documents?.find(
      (document) => document.role === "primary" && document.required,
    );
    assert.equal(primary?.id, profile.primaryDocumentId);
    assert.equal(primary?.extractionSchema, profile.extractionSchema);
  }
});

test("SSA reconsideration factory artifacts are ChatGPT-executable against the required connector surface", () => {
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

test("SSA reconsideration chat certification fails closed when packet review is unavailable", () => {
  const artifact = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");
  assert.ok(artifact);
  const tools = new Set(AVAILABLE_TOOLS);
  tools.delete("preview_packet");

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
        item.toolName === "preview_packet",
    ),
  );
});

test("SSDI and SSI expose program-specific claimant fields without cross-program leakage", () => {
  const ssdi = getSsaReconsiderationFactoryArtifact("appeal-ssdi-denial");
  const ssi = getSsaReconsiderationFactoryArtifact("appeal-ssi-denial");
  assert.ok(ssdi);
  assert.ok(ssi);

  const ids = (artifact: typeof ssdi) =>
    new Set(
      artifact.manifest.steps
        ?.flatMap((step) => step.fields ?? [])
        .map((field) => field.id) ?? [],
    );

  const ssdiIds = ids(ssdi);
  const ssiIds = ids(ssi);

  assert.ok(ssdiIds.has("workChanges"));
  assert.equal(ssdiIds.has("incomeFacts"), false);
  assert.ok(ssiIds.has("incomeFacts"));
  assert.ok(ssiIds.has("resourceFacts"));
  assert.equal(ssiIds.has("workChanges"), false);
  assert.ok(ssdiIds.has("factsConfirmed"));
  assert.ok(ssiIds.has("factsConfirmed"));
  assert.ok(ssdiIds.has("recipientAddress"));
  assert.ok(ssiIds.has("recipientAddress"));
});

test("unknown SSA workflow has no factory artifact", () => {
  assert.equal(getSsaReconsiderationFactoryArtifact("ssdi-denial"), null);
});
