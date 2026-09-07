import test from "node:test";
import assert from "node:assert/strict";
import { INSURANCE_CLAIM_DENIAL_GOLD, INSURANCE_CLAIM_DENIAL_PRICING as P } from "../src/domain/insurance-claim-denial-gold";

test("Insurance Claim Denial Gold contract is authority-first and fully executable", () => {
  assert.equal(INSURANCE_CLAIM_DENIAL_GOLD.workflowId, "denied-claim");
  assert.equal(INSURANCE_CLAIM_DENIAL_GOLD.lifecycle, "authority");
  assert.ok(INSURANCE_CLAIM_DENIAL_GOLD.capabilities.includes("independent-validation"));
  assert.ok(INSURANCE_CLAIM_DENIAL_GOLD.capabilities.includes("pricing"));
  assert.ok(INSURANCE_CLAIM_DENIAL_GOLD.capabilities.includes("proof"));
  assert.ok(INSURANCE_CLAIM_DENIAL_GOLD.authorityRules.some((rule) => rule.includes("Never invent")));
  assert.ok(INSURANCE_CLAIM_DENIAL_GOLD.authoritySources.length >= 2);
});

test("Insurance Claim Denial pricing is transparent and economically bounded", () => {
  // This is an ADVANCED-tier canonical profile ($69.99 base, 8 included
  // pages) — the same tier as ssdi-appeal, court-ruling, and
  // medical-insurance-denial — not the older STANDARD-tier bounds
  // ($12.99-$39.99, 3 pages) this test previously enforced.
  assert.equal(P.includedResponsePages, 8);
  assert.ok(P.preparationFee >= 12.99 && P.preparationFee <= 79.99);
  assert.ok(P.responsePagePrice >= 0.35 && P.responsePagePrice <= 0.50);
  assert.ok(P.supportingPagePrice >= 0.20 && P.supportingPagePrice <= 0.35);
  assert.ok(P.standardMail >= 4.99 && P.standardMail <= 5.99);
  assert.ok(P.certifiedMail >= 10.99 && P.certifiedMail <= 14.99);
  assert.ok(P.registeredMail > P.certifiedMail);
});
