import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  carInsuranceClaimWorkflow,
  dentalInsuranceDenialWorkflow,
  getInsuranceAppealWorkflowSpec,
  insuranceAppealManifest,
  insuranceAppealWorkflowSpecs,
  insuranceClaimDenialWorkflow,
  insuranceCoverageDenialWorkflow,
  lifeInsuranceDenialWorkflow,
  medicalInsuranceDenialWorkflow,
  medicalNecessityDenialWorkflow,
  outOfNetworkDenialWorkflow,
  priorAuthorizationDenialWorkflow,
  timelyFilingDenialWorkflow,
} from "../src/index.js";

describe("Insurance appeal workflow overlays", () => {
  test("all migrated canonical workflow identities inherit the reusable insurance appeal capabilities", () => {
    assert.equal(insuranceAppealWorkflowSpecs.length, 10);
    for (const spec of insuranceAppealWorkflowSpecs) {
      assert.ok(spec.workflowId.startsWith("appeal-"));
      assert.equal(spec.baseDomainPackId, insuranceAppealManifest.id);
      assert.deepEqual(spec.canonicalCapabilities, insuranceAppealManifest.capabilities);
      assert.ok(spec.canonicalCapabilities.includes("timeline"));
      assert.ok(spec.canonicalCapabilities.includes("mailing"));
      assert.ok(spec.canonicalCapabilities.includes("proofAudit"));
      assert.equal(getInsuranceAppealWorkflowSpec(spec.workflowId), spec);
      assert.equal("pricingWorkflowId" in spec, false);
    }
  });

  test("car insurance claim overlay preserves source-bound valuation and liability distinctions", () => {
    assert.deepEqual(carInsuranceClaimWorkflow.specializedChecks, ["auto-claim-source-resolution"]);
    assert.ok(carInsuranceClaimWorkflow.authorityRules.some((rule) => rule.includes("Never invent coverage terms")));
    assert.ok(carInsuranceClaimWorkflow.authorityRules.some((rule) => rule.includes("Keep coverage, liability, valuation")));
    assert.ok(carInsuranceClaimWorkflow.authoritySources.every((source) => source.freshnessRule === "verify-before-use"));
  });

  test("timely filing denial keeps receipt and deadline facts source-bound", () => {
    assert.deepEqual(timelyFilingDenialWorkflow.specializedChecks, ["timely-filing-source-resolution"]);
    assert.ok(timelyFilingDenialWorkflow.authorityRules.some((rule) => rule.includes("Never invent a filing deadline")));
    assert.ok(timelyFilingDenialWorkflow.authorityRules.some((rule) => rule.includes("not automatically an appeal deadline")));
  });

  test("medical denial preserves the mature no-invention and medical-necessity distinctions", () => {
    assert.ok(medicalInsuranceDenialWorkflow.specializedChecks.includes("medical-necessity-analysis"));
    assert.ok(medicalInsuranceDenialWorkflow.authorityRules.some((rule) => rule.includes("Never invent diagnoses")));
    assert.ok(medicalInsuranceDenialWorkflow.authorityRules.some((rule) => rule.includes("Separate medical-necessity review")));
  });

  test("coverage and life denial retain their explicit legacy specialized capabilities", () => {
    assert.deepEqual(insuranceCoverageDenialWorkflow.specializedChecks, ["coverage-analysis"]);
    assert.deepEqual(lifeInsuranceDenialWorkflow.specializedChecks, ["policy-source-resolution"]);
  });

  test("prior authorization, dental, and life do not turn notice dates into automatic deadlines", () => {
    assert.ok(priorAuthorizationDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("A denial date is not automatically a deadline"),
    ));
    assert.ok(dentalInsuranceDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("A decision date is not automatically a deadline"),
    ));
    assert.ok(lifeInsuranceDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("A claim or denial date is not automatically a filing deadline"),
    ));
  });

  test("network and medical-necessity variants keep source-dependent facts unresolved until verified", () => {
    assert.ok(outOfNetworkDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("never infer them from provider type, ZIP code, or general practice"),
    ));
    assert.ok(medicalNecessityDenialWorkflow.authorityRules.some((rule) =>
      rule.includes("deadline extracted from a notice remains unverified"),
    ));
  });

  test("general claim denial retains source freshness requirements", () => {
    assert.equal(insuranceClaimDenialWorkflow.authoritySources.length, 3);
    assert.ok(insuranceClaimDenialWorkflow.authoritySources.every((source) => source.freshnessRule === "verify-before-use"));
  });
});
