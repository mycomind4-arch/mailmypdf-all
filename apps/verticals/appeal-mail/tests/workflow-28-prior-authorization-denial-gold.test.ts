import test from "node:test";
import assert from "node:assert/strict";
import { PRIOR_AUTHORIZATION_DENIAL_GOLD, PRIOR_AUTHORIZATION_DENIAL_PRICING } from "../src/domain/prior-authorization-denial-gold";

test("Workflow #28 Gold: declares authority-first capabilities and workflow-specific pricing", () => {
  assert.equal(PRIOR_AUTHORIZATION_DENIAL_GOLD.workflowId, "prior-authorization-denial");
  assert.equal(PRIOR_AUTHORIZATION_DENIAL_GOLD.lifecycle, "authority");
  assert.ok(PRIOR_AUTHORIZATION_DENIAL_GOLD.capabilities.includes("independent-validation"));
  assert.ok(PRIOR_AUTHORIZATION_DENIAL_GOLD.capabilities.includes("pricing"));
  // Derived from the canonical @mailmypdf/pricing profile for
  // "prior-authorization-denial" ($59.99 base, 8 included pages), not the
  // pre-migration $24.99/3.
  assert.equal(PRIOR_AUTHORIZATION_DENIAL_PRICING.preparationFee, 59.99);
  assert.equal(PRIOR_AUTHORIZATION_DENIAL_PRICING.includedResponsePages, 8);
  assert.ok(PRIOR_AUTHORIZATION_DENIAL_PRICING.certifiedMail > PRIOR_AUTHORIZATION_DENIAL_PRICING.standardMail);
});

test("Workflow #28 Gold: refuses universal procedural assumptions", () => {
  assert.ok(PRIOR_AUTHORIZATION_DENIAL_GOLD.authorityRules.some((x) => x.includes("Never invent authorization criteria")));
  assert.ok(PRIOR_AUTHORIZATION_DENIAL_GOLD.authorityRules.some((x) => x.includes("deadline")));
});
