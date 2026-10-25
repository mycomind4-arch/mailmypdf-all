import assert from "node:assert/strict";
import test from "node:test";

import workflowConfig from "../workflows/public-records-request/config";
import publicRecordsRequestManifest from "../workflows/public-records-request/manifest";
import { getRecordsRequestFactoryArtifact } from "@mailmypdf/workflows";

test("Public Records Request landing, manifest, runtime, and UI config share one factory artifact", () => {
  const artifact = getRecordsRequestFactoryArtifact("public-records-request");

  assert.ok(artifact);
  assert.equal(artifact.factoryReady, true);
  assert.deepEqual(artifact.diagnostics, []);

  assert.equal(workflowConfig.id, artifact.workflowId);
  assert.equal(workflowConfig.sectionId, artifact.canonical.sectionId);
  assert.equal(workflowConfig.path, artifact.canonical.publicHref);
  assert.equal(workflowConfig.startPath, artifact.manifest.route);
  assert.equal(artifact.canonical.id, "records-request/public-records-request");
  assert.equal(artifact.startConfig.title, workflowConfig.title);
  assert.equal(artifact.startConfig.backHref, workflowConfig.path);
  assert.equal(publicRecordsRequestManifest, artifact.definition);
  assert.ok(artifact.runtimePolicy.chatContract);
});

test("Public Records Request remains request-first and does not manufacture a required source document", () => {
  const artifact = getRecordsRequestFactoryArtifact("public-records-request");
  assert.ok(artifact);

  assert.equal(artifact.manifest.primaryInput, "request");
  assert.equal(
    artifact.manifest.documents?.find((document) => document.role === "primary")
      ?.required,
    false,
  );
  assert.equal(artifact.runtimePolicy.requiresSourceDocument, false);
});
