import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assessSecurityAgreementEvidence } from "../rules/security-agreement";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Security Agreement Generation workflow", () => {
  test("does not treat a collateral description alone as a complete agreement record", () => {
    const result = assessSecurityAgreementEvidence({
      agreementId: "agreement-1",
      collateralDescription: "Example collateral",
      sourceRefs: [],
      authenticatedEvidence: false,
    });
    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("debtor-finding"));
    assert.ok(result.missing.includes("secured-party-finding"));
    assert.ok(result.missing.includes("obligation-finding"));
  });

  test("remains non-executable until drafting and authority rules are implemented", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });

  test("declares signature capture as optional, with its documentStorage dependency satisfied", () => {
    // A throw here would come from defineWorkflow()'s eager
    // assertCapabilityDependencies() check at module load time, not from
    // this assertion — this test documents the intent explicitly.
    assert.ok(workflowManifest.manifest.optionalCapabilities.includes("signature"));
    assert.ok(workflowManifest.manifest.optionalCapabilities.includes("documentStorage"));
    assert.equal(workflowManifest.manifest.requiredCapabilities.includes("signature"), false);
  });
});
