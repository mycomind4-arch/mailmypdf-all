import assert from "node:assert/strict";
import test from "node:test";
import { certifyWorkflowManifest } from "../src/workflow-certifier.js";
import type { WorkflowManifest } from "../src/workflow-manifest.js";

const manifest: WorkflowManifest = {
  id: "cp2000-response",
  vertical: "notice",
  title: "CP2000 Response",
  route: "/notice/cp2000-response",
  pipeline: "P02_OFFICIAL_RESPONSE",
  adapters: ["tax", "government"],
  requiredCapabilities: [
    "security", "classification", "extraction", "provenance", "deadlines",
    "findings", "requirements", "evidence", "strategy", "draft", "draftProvenance",
    "validation", "blockingGate", "humanReview", "mailing", "tracking", "proofAudit",
  ],
  optionalCapabilities: ["discrepancies", "research"],
  notApplicableCapabilities: [],
  maturity: "wired",
  primaryInput: "document",
  requiresHumanReview: true,
  allowsConsequentialAction: true,
};

test("workflow certification checks the factory, pipeline, page, and route contract", () => {
  const result = certifyWorkflowManifest(manifest);
  assert.ok(result.checks.some((check) => check.id === "factory"));
  assert.ok(result.checks.some((check) => check.id === "pipeline"));
  assert.ok(result.checks.some((check) => check.id === "authority-page"));
  assert.ok(result.checks.some((check) => check.id === "route-contract"));
});
