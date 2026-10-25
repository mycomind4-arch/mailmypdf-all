import assert from "node:assert/strict";
import test from "node:test";

import {
  certifyNoticeResponseFactoryArtifactForChat,
  getNoticeResponseFactoryArtifact,
} from "../src/domain-packs/notice-response/factory-artifact.js";

const AVAILABLE_TOOLS = [
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
] as const;

test("CP14 factory artifact unifies canonical identity, manifest, runtime, and UI start config", () => {
  const artifact = getNoticeResponseFactoryArtifact("cp14-response");
  assert.ok(artifact);

  assert.equal(artifact.factoryReady, true);
  assert.deepEqual(artifact.diagnostics, []);
  assert.equal(artifact.canonicalId, "notice-respond/cp14-response");
  assert.equal(artifact.canonical.id, "notice-respond/cp14-response");
  assert.equal(artifact.canonical.slug, "cp14-response");
  assert.equal(artifact.canonical.sectionId, "notice-respond");
  assert.equal(artifact.canonical.execution?.kind, "platform");
  assert.equal(artifact.canonical.execution?.policyFamily, "notice-response");

  assert.equal(artifact.manifest.id, "cp14-response");
  assert.equal(artifact.manifest.vertical, "notice-respond");
  assert.equal(
    artifact.manifest.route,
    "/notice-respond/workflows/cp14-response/start",
  );
  assert.equal(artifact.startConfig.workflowId, "cp14-response");
  assert.equal(
    artifact.startConfig.backHref,
    "/notice-respond/workflows/cp14-response",
  );

  const primary = artifact.manifest.documents?.find(
    (document) => document.role === "primary" && document.required,
  );
  assert.equal(primary?.id, "cp14-notice");
  assert.equal(primary?.extractionSchema, "irs.cp14.v1");
  assert.ok(artifact.runtimePolicy.chatContract);
});

test("CP14 factory artifact is chat executable only against the required tool surface", () => {
  const artifact = getNoticeResponseFactoryArtifact("cp14-response");
  assert.ok(artifact);

  const ready = certifyNoticeResponseFactoryArtifactForChat(
    artifact,
    AVAILABLE_TOOLS,
  );
  assert.equal(ready.executable, true);
  assert.equal(ready.chatExecutable, true);
  assert.deepEqual(ready.diagnostics, []);
  assert.deepEqual(ready.chatReadiness.diagnostics, []);

  const missingPreview = AVAILABLE_TOOLS.filter(
    (tool) => tool !== "preview_packet",
  );
  const blocked = certifyNoticeResponseFactoryArtifactForChat(
    artifact,
    missingPreview,
  );
  assert.equal(blocked.executable, true);
  assert.equal(blocked.chatExecutable, false);
  assert.ok(
    blocked.chatReadiness.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "CONNECTOR_TOOL_MISSING" &&
        diagnostic.toolName === "preview_packet",
    ),
  );
});

test("unknown notice workflow has no factory artifact", () => {
  assert.equal(getNoticeResponseFactoryArtifact("not-a-workflow"), null);
});
