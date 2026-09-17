import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getInsuranceAppealWorkflowSpec,
  insuranceAppealManifest,
  insuranceClaimDenialWorkflow,
  medicalInsuranceDenialWorkflow,
  priorAuthorizationDenialWorkflow,
} from "../src/index.js";

describe("Insurance appeal workflow overlays", () => {
  test("canonical workflow identities inherit the reusable insurance appeal capabilities", () => {
    for (const spec of [
      insuranceClaimDenialWorkflow,
      medicalInsuranceDenialWorkflow,
      priorAuthorizationDenialWorkflow,
    ]) {
      assert.ok(spec.workflowId.startsWith("appeal-"));
      assert.equal(spec.baseDomainPackId, insuranceAppealManifest.id);
      assert.deepEqual(spec.canonicalCapabilities, insuranceAppealManifest.capabilities);
      assert.ok(spec.canonicalCapabilities.includes("timeline"));
      assert.ok(spec.canonicalCapabilities.includes("mailing"));
      assert.ok(spec.canonicalCapabilities.includes("proofAudit"));
    }
  });

  test("medical denial preserves the mature no-invention and medical-necessity distinctions", () => {
    assert.ok(medicalInsuranceDenialWorkflow.specializedChecks.includes("medical-necessity-analysis"));
    assert.ok(medicalInsuranceDenialWorkflow.authorityRules.some((rule) => rule.includes("Never invent diagnoses")));
    assert.ok(medicalInsuranceDenialWorkflow.authorityRules.some((rule) => rule.includes("Separate medical-necessity review")));
  });

  test("prior authorization does not treat the denial date as an automatic deadline", () => {
    assert.ok(priorAuthorizationDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("A denial date is not automatically a deadline"),
    ));
  });

  test("general claim denial retains source freshness requirements and pricing identity", () => {
    assert.equal(insuranceClaimDenialWorkflow.pricingWorkflowId, "denied-claim");
    assert.equal(insuranceClaimDenialWorkflow.authoritySources.length, 3);
    assert.ok(insuranceClaimDenialWorkflow.authoritySources.every((source) => source.freshnessRule === "verify-before-use"));
    assert.equal(getInsuranceAppealWorkflowSpec("appeal-insurance-claim-denial"), insuranceClaimDenialWorkflow);
  });
});
