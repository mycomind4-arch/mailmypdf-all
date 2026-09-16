import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkflowManifest,
  defineWorkflowFromBlueprint,
} from "../src/workflow-blueprints.js";
import { certifyWorkflowCapabilities } from "../src/capability-certification.js";

test("official-response blueprint expands into full MailMyPDF platform capabilities", () => {
  const manifest = buildWorkflowManifest({
    id: "cp2000-response",
    vertical: "notice-respond",
    title: "Respond to an IRS CP2000 Notice",
    route: "/notice-respond/workflows/cp2000-response",
    archetype: "official-response",
    adapters: ["government", "tax"],
    commerce: "paid",
    documents: [
      {
        id: "cp2000-notice",
        label: "IRS CP2000 notice",
        role: "primary",
        required: true,
        acceptedKinds: ["notice"],
        extractionSchema: "irs.cp2000.v1",
      },
    ],
  });

  for (const capability of [
    "secureUpload",
    "documentScanning",
    "visionAnalysis",
    "understand",
    "facts",
    "deadlines",
    "evidence",
    "draft",
    "humanReview",
    "approval",
    "pdfGeneration",
    "packetAssembly",
    "pricing",
    "payment",
    "addressVerification",
    "mailing",
    "tracking",
    "proofAudit",
    "archive",
    "resilience",
    "observability",
    "acceptanceTesting",
  ] as const) {
    assert.ok(
      manifest.requiredCapabilities.includes(capability),
      `expected ${capability}`,
    );
  }

  assert.deepEqual(
    manifest.steps?.map((step) => step.id),
    ["intake", "documents", "analysis", "evidence", "strategy", "draft", "review", "checkout", "mail"],
  );
  assert.ok(manifest.gates?.some((gate) => gate.id === "mail-authorized"));
  assert.ok(manifest.outputs?.some((output) => output.kind === "archive"));
});

test("blueprint-generated official response compiles through defineWorkflow", () => {
  const defined = defineWorkflowFromBlueprint({
    id: "cp2000-response",
    vertical: "notice-respond",
    title: "Respond to an IRS CP2000 Notice",
    route: "/notice-respond/workflows/cp2000-response",
    archetype: "official-response",
    adapters: ["government", "tax"],
  });

  assert.equal(defined.plan.version, 2);
  assert.ok(defined.plan.steps.length >= 7);
  assert.equal(
    certifyWorkflowCapabilities(defined.manifest).productionReady,
    true,
  );
});

test("free records workflow omits payment but preserves mailing proof controls", () => {
  const manifest = buildWorkflowManifest({
    id: "public-records-request",
    vertical: "records-request",
    title: "Public Records Request",
    route: "/records-request/workflows/public-records-request",
    archetype: "records-request",
    adapters: ["records", "government"],
    commerce: "free",
  });

  assert.equal(manifest.requiredCapabilities.includes("payment"), false);
  assert.equal(manifest.requiredCapabilities.includes("pricing"), false);
  assert.ok(manifest.requiredCapabilities.includes("mailing"));
  assert.ok(manifest.requiredCapabilities.includes("approval"));
  assert.ok(manifest.requiredCapabilities.includes("proofAudit"));
});


test("all ten archetypes compile with compatible reference adapters", () => {
  const fixtures = [
    ["simple-mail", ["business"]],
    ["official-response", ["government"]],
    ["appeal", ["government"]],
    ["court-response", ["court-procedure"]],
    ["immigration-response", ["immigration"]],
    ["dispute", ["credit-debt"]],
    ["business-correspondence", ["business"]],
    ["records-request", ["records"]],
    ["regulatory-response", ["permits-regulatory"]],
    ["claim-proof", ["government"]],
  ] as const;

  for (const [archetype, adapters] of fixtures) {
    const defined = defineWorkflowFromBlueprint({
      id: `fixture-${archetype}`,
      vertical: "fixture",
      title: `Fixture ${archetype}`,
      route: `/fixture/${archetype}`,
      archetype,
      adapters,
      commerce: "paid",
    });
    assert.equal(defined.plan.version, 2, archetype);
    assert.ok(defined.manifest.requiredCapabilities.includes("facts"), archetype);
    assert.equal(
      certifyWorkflowCapabilities(defined.manifest).dependencyErrors.length,
      0,
      archetype,
    );
  }
});
