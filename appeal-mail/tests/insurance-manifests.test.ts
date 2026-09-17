import assert from "node:assert/strict";
import test from "node:test";

import insuranceClaimDenialManifest from "../workflows/appeal-insurance-claim-denial/manifest.js";
import medicalInsuranceDenialManifest from "../workflows/appeal-medical-insurance-denial/manifest.js";
import priorAuthorizationDenialManifest from "../workflows/appeal-prior-authorization-denial/manifest.js";
import insuranceCoverageDenialManifest from "../workflows/appeal-insurance-coverage-denial/manifest.js";
import medicalNecessityDenialManifest from "../workflows/appeal-medical-necessity-denial/manifest.js";
import outOfNetworkDenialManifest from "../workflows/appeal-out-of-network-denial/manifest.js";
import dentalInsuranceDenialManifest from "../workflows/appeal-dental-insurance-denial/manifest.js";
import lifeInsuranceDenialManifest from "../workflows/appeal-life-insurance-denial/manifest.js";

const manifests = [
  insuranceClaimDenialManifest,
  medicalInsuranceDenialManifest,
  priorAuthorizationDenialManifest,
  insuranceCoverageDenialManifest,
  medicalNecessityDenialManifest,
  outOfNetworkDenialManifest,
  dentalInsuranceDenialManifest,
  lifeInsuranceDenialManifest,
] as const;

test("insurance appeal manifest family is uniquely wired to the shared appeal contract", () => {
  assert.equal(manifests.length, 8);
  assert.equal(new Set(manifests.map((manifest) => manifest.manifest.id)).size, manifests.length);
  assert.equal(new Set(manifests.map((manifest) => manifest.manifest.route)).size, manifests.length);

  for (const workflow of manifests) {
    const manifest = workflow.manifest;
    assert.equal(manifest.vertical, "appeal-mail");
    assert.equal(manifest.pipeline, "P03_APPEAL");
    assert.equal(manifest.maturity, "wired");
    assert.equal(manifest.requiresHumanReview, true);
    assert.equal(manifest.allowsConsequentialAction, true);
    assert.equal(manifest.steps?.length, 7);
    assert.equal(manifest.route, `/appeal-mail/workflows/${manifest.id}/start`);
    assert.equal(manifest.documents?.[0]?.extractionSchema, "claim-denial-letter-v1");
    assert.ok(manifest.requiredCapabilities.includes("secureUpload"));
    assert.ok(manifest.requiredCapabilities.includes("aiExecution"));
    assert.ok(manifest.requiredCapabilities.includes("packetAssembly"));
    assert.ok(manifest.requiredCapabilities.includes("payment"));
    assert.ok(manifest.requiredCapabilities.includes("mailing"));
    assert.ok(manifest.requiredCapabilities.includes("proofAudit"));
    assert.ok(manifest.gates?.some((gate) => gate.kind === "human_review" && gate.required));
    assert.ok(manifest.gates?.some((gate) => gate.kind === "mailing_authorization" && gate.required));
  }
});
