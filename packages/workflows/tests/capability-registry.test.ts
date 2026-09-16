import { existsSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITIES, capabilityIds, hasCapability, validateCapabilityRegistry } from "../src/capability-registry.js";
import type { WorkflowCapability } from "../src/workflow-manifest.js";

test("capability registry includes the complete cross-workflow platform surface", () => {
  const required: WorkflowCapability[] = [
    "identity","matterState","aiExecution","secureUpload","documentStorage","documentScanning","retention",
    "visionAnalysis","pdfGeneration","packetAssembly","pricing","payment","addressVerification",
    "notifications","resilience","observability","acceptanceTesting","proofAudit","archive",
  ];
  for (const id of required) {
    assert.equal(hasCapability(id),true,`missing capability ${id}`);
    assert.ok(CAPABILITIES[id].implementation.startsWith("@mailmypdf/"));
  }
  assert.equal(new Set(capabilityIds).size,capabilityIds.length);
});


test("capability dependency graph is acyclic and consequential actions remain gated", () => {
  assert.deepEqual(validateCapabilityRegistry(), []);
});


test("every capability implementation package exists in the workspace", () => {
  const packagesRoot = path.resolve(process.cwd(), "..");

  for (const capability of Object.values(CAPABILITIES)) {
    const packageFolder = capability.implementation.replace("@mailmypdf/", "");
    const packageJson = path.join(packagesRoot, packageFolder, "package.json");
    assert.equal(
      existsSync(packageJson),
      true,
      `${capability.id} points to missing package ${capability.implementation}`,
    );
  }
});
