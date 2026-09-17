import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalWorkflowPricingProfile,
  pricingCatalogWorkflowId,
} from "../src/canonical-workflow-pricing.ts";

const expectedAliases: Record<string, string> = {
  "appeal-ssdi-denial": "ssdi-denial",
  "appeal-denied-claim": "denied-claim",
  "appeal-insurance-claim-denial": "insurance-claim-denial",
  "appeal-insurance-coverage-denial": "insurance-coverage-denial",
  "appeal-medical-insurance-denial": "medical-insurance-denial",
  "appeal-medical-necessity-denial": "medical-necessity-appeal",
  "appeal-prior-authorization-denial": "prior-authorization-denial",
  "appeal-out-of-network-denial": "out-of-network-denial",
  "appeal-dental-insurance-denial": "dental-insurance-appeal",
  "appeal-life-insurance-denial": "life-insurance-denial",
};

test("canonical appeal ids resolve to existing pricing catalog profiles", () => {
  for (const [canonicalId, catalogId] of Object.entries(expectedAliases)) {
    assert.equal(pricingCatalogWorkflowId(canonicalId), catalogId);
    const profile = getCanonicalWorkflowPricingProfile(canonicalId);
    assert.ok(profile, `missing pricing profile for ${canonicalId}`);
    assert.equal(profile.workflowId, canonicalId);
    assert.equal(profile.verticalId, "appeal-mail");
  }
});

test("insurance claim denial uses its matching profile instead of generic denied-claim pricing", () => {
  assert.equal(pricingCatalogWorkflowId("appeal-insurance-claim-denial"), "insurance-claim-denial");
  assert.equal(pricingCatalogWorkflowId("appeal-denied-claim"), "denied-claim");

  const insurance = getCanonicalWorkflowPricingProfile("appeal-insurance-claim-denial");
  const generic = getCanonicalWorkflowPricingProfile("appeal-denied-claim");
  assert.ok(insurance);
  assert.ok(generic);
  assert.equal(insurance.basePriceCents, 6999);
  assert.equal(generic.basePriceCents, 6999);
});
