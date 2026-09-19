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

test("a manifest requiring only implemented (not production-verified) capabilities does not pass production certification", () => {
  // identity/matterState/security/aiExecution/extraction/facts/provenance/
  // deadlines/validation/blockingGate/humanReview/pdfGeneration/resilience/
  // observability are "implemented", not "production" — a manifest cannot
  // ride on a capability existing in the registry as if that alone proved
  // it is production-ready.
  const result = certifyWorkflowCapabilities(manifest);
  assert.deepEqual(result.dependencyErrors, []);
  assert.ok(result.nonProductionRequired.length > 0);
  assert.ok(result.nonProductionRequired.includes("identity"));
  assert.ok(result.nonProductionRequired.includes("matterState"));
  assert.equal(result.productionReady, false);
});

test("a manifest requiring only genuinely production-certified capabilities passes", () => {
  // "security" is a dependency of secureUpload/documentStorage but is itself
  // only "implemented" — declared as optional (satisfies dependency
  // resolution) rather than required, so it is correctly excluded from the
  // nonProductionRequired check, which only inspects requiredCapabilities.
  const productionOnly: WorkflowManifest = {
    ...manifest,
    requiredCapabilities: [
      "secureUpload", "documentStorage", "documentScanning", "retention",
      "addressVerification", "notifications", "acceptanceTesting",
    ],
    optionalCapabilities: ["security"],
  };
  const result = certifyWorkflowCapabilities(productionOnly);
  assert.deepEqual(result.dependencyErrors, []);
  assert.deepEqual(result.nonProductionRequired, []);
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
  assert.equal(
    health.production + health.implemented + health.partial + health.foundation,
    health.total,
  );
  // The dangerous "defaults to production" bug this closure step fixed means
  // there must be a genuine, non-zero "implemented" population today — if
  // this regresses to 0, something silently started defaulting again.
  assert.ok(health.implemented > 0);
});
