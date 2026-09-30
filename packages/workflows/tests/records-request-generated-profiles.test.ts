import assert from "node:assert/strict";
import test from "node:test";

import {
  RECORDS_REQUEST_WORKFLOW_PROFILES,
  getRecordsRequestWorkflowProfile,
} from "../src/domain-packs/records-request/profiles.js";
import {
  RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS,
  getRecordsRequestRuntimePolicy,
} from "../src/domain-packs/records-request/runtime-policy.js";
import {
  getRecordsRequestFactoryArtifact,
} from "../src/domain-packs/records-request/factory-artifact.js";

test("Records Request profiles and runtime policy registry stay identical", () => {
  const profileIds = RECORDS_REQUEST_WORKFLOW_PROFILES.map(
    (profile) => profile.workflowId,
  );
  assert.equal(new Set(profileIds).size, profileIds.length);
  assert.deepEqual(
    [...RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS].sort(),
    [...profileIds].sort(),
  );

  for (const workflowId of profileIds) {
    assert.ok(getRecordsRequestWorkflowProfile(workflowId));
    assert.ok(getRecordsRequestRuntimePolicy(workflowId));
  }
});

test("every Records Request profile resolves a factory-ready artifact", () => {
  for (const profile of RECORDS_REQUEST_WORKFLOW_PROFILES) {
    const artifact = getRecordsRequestFactoryArtifact(profile.workflowId);
    assert.ok(artifact, profile.workflowId);
    assert.equal(artifact.factoryReady, true, profile.workflowId);
    assert.deepEqual(artifact.diagnostics, [], profile.workflowId);
    assert.equal(artifact.canonical.id, `records-request/${profile.workflowId}`);
  }
});
