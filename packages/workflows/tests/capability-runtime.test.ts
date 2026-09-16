import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityRuntime, compileWorkflowExecutionPlan } from "../src/capability-runtime.js";
import { defineWorkflow } from "../src/define-workflow.js";
import type { WorkflowManifest } from "../src/workflow-manifest.js";

const manifest: WorkflowManifest = {
  id: "fixture",
  vertical: "notice",
  title: "Fixture",
  route: "/notice/fixture",
  pipeline: "P02_OFFICIAL_RESPONSE",
  adapters: ["government"],
  requiredCapabilities: [
    "security", "classification", "extraction", "provenance", "deadlines", "findings",
    "requirements", "evidence", "strategy", "draft", "draftProvenance", "validation",
    "blockingGate", "humanReview", "approval", "pdfGeneration", "packetAssembly",
    "addressVerification", "mailing", "tracking", "proofAudit",
  ],
  optionalCapabilities: [],
  notApplicableCapabilities: [],
  maturity: "wired",
  primaryInput: "document",
  requiresHumanReview: true,
  allowsConsequentialAction: true,
  version: 2,
  steps: [
    { id: "intake", title: "Intake", uses: ["security", "extraction"] },
    { id: "review", title: "Review", uses: ["humanReview", "approval"] },
    { id: "mail", title: "Mail", uses: ["mailing", "tracking", "proofAudit"] },
  ],
  gates: [
    { id: "review-approved", kind: "human_review", label: "Owner reviewed the packet", required: true, beforeCapability: "approval" },
    { id: "mail-approved", kind: "mailing_authorization", label: "Owner authorized mailing", required: true, beforeCapability: "mailing" },
  ],
};

test("defineWorkflow compiles declarative steps", () => {
  const defined = defineWorkflow(manifest);
  assert.equal(defined.plan.version, 2);
  assert.equal(defined.plan.steps.length, 3);
  assert.deepEqual(compileWorkflowExecutionPlan(manifest).steps[2].capabilities, ["mailing", "tracking", "proofAudit"]);
});

test("runtime blocks consequential capability until explicit gates are approved", async () => {
  const runtime = new CapabilityRuntime();
  runtime.register({
    id: "mailing",
    async execute() { return { capability: "mailing", status: "passed", messages: [] }; },
  });
  const blocked = await runtime.executeCapability(manifest, "mailing", {
    matterId: "m1", actorId: "u1", scopes: [], approvals: [], input: {}, prior: new Map(),
  });
  assert.equal(blocked.status, "blocked");

  const passed = await runtime.executeCapability(manifest, "mailing", {
    matterId: "m1", actorId: "u1", scopes: [], approvals: ["review-approved", "mail-approved"], input: {}, prior: new Map(),
  });
  assert.equal(passed.status, "passed");
});
