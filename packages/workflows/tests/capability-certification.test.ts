import assert from "node:assert/strict";
import test from "node:test";
import {
  certifyWorkflowCapabilities,
  platformCapabilityHealth,
  productionBaselineFor,
} from "../src/capability-certification.js";
import type { WorkflowManifest } from "../src/workflow-manifest.js";

const manifest: WorkflowManifest = {
  id: "fixture",
  vertical: "notice",
  title: "Fixture",
  route: "/notice/fixture",
  pipeline: "P02_OFFICIAL_RESPONSE",
  adapters: ["government"],
  requiredCapabilities: [
    "identity", "matterState", "security", "secureUpload", "documentStorage",
    "documentScanning", "retention", "aiExecution", "extraction", "facts",
    "provenance", "deadlines", "notifications", "draft", "validation",
    "blockingGate", "humanReview", "approval", "pdfGeneration", "packetAssembly",
    "addressVerification", "mailing", "tracking", "proofAudit", "archive",
    "resilience", "observability", "acceptanceTesting",
  ],
  optionalCapabilities: [],
  notApplicableCapabilities: [],
  maturity: "production-verified",
  primaryInput: "document",
  requiresHumanReview: true,
  allowsConsequentialAction: true,
};

test("production baseline expands from workflow shape", () => {
  const baseline = productionBaselineFor(manifest);
  assert.ok(baseline.includes("secureUpload"));
  assert.ok(baseline.includes("notifications"));
  assert.ok(baseline.includes("packetAssembly"));
  assert.ok(baseline.includes("acceptanceTesting"));
});

test("complete production manifest passes static capability certification", () => {
  const result = certifyWorkflowCapabilities(manifest);
  assert.deepEqual(result.dependencyErrors, []);
  assert.deepEqual(result.productionBaselineMissing, []);
  assert.deepEqual(result.nonProductionRequired, []);
  assert.equal(result.productionReady, true);
});

test("certification identifies missing operational baseline", () => {
  const incomplete: WorkflowManifest = {
    ...manifest,
    requiredCapabilities: manifest.requiredCapabilities.filter(
      (id) => id !== "acceptanceTesting" && id !== "observability",
    ),
  };
  const result = certifyWorkflowCapabilities(incomplete);
  assert.ok(result.productionBaselineMissing.includes("acceptanceTesting"));
  assert.ok(result.productionBaselineMissing.includes("observability"));
  assert.equal(result.productionReady, false);
});

test("platform capability health is internally consistent", () => {
  const health = platformCapabilityHealth();
  assert.ok(health.total > 30);
  assert.equal(health.production + health.partial + health.foundation, health.total);
});
