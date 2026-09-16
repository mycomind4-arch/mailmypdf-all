import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITIES, capabilityIds, hasCapability } from "../src/capability-registry.js";
import type { WorkflowCapability } from "../src/workflow-manifest.js";

test("capability registry includes the complete cross-workflow platform surface", () => {
  const required: WorkflowCapability[] = [
    "identity","matterState","secureUpload","documentStorage","documentScanning","retention",
    "visionAnalysis","pdfGeneration","packetAssembly","pricing","payment","addressVerification",
    "notifications","proofAudit",
  ];
  for (const id of required) {
    assert.equal(hasCapability(id),true,`missing capability ${id}`);
    assert.ok(CAPABILITIES[id].implementation.startsWith("@mailmypdf/"));
  }
  assert.equal(new Set(capabilityIds).size,capabilityIds.length);
});
