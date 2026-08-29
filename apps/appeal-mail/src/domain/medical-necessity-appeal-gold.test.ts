import test from "node:test";
import assert from "node:assert/strict";
import { MEDICAL_NECESSITY_AUTHORITY_RULES, MEDICAL_NECESSITY_PRICING, MEDICAL_NECESSITY_GOLD } from "./medical-necessity-denial-gold";

test("medical necessity Gold contract is authority-first and workflow-specific", () => {
  assert.equal(MEDICAL_NECESSITY_GOLD.workflowId, "medical-necessity-appeal");
  assert.equal(MEDICAL_NECESSITY_GOLD.lifecycle, "authority");
  assert.ok(MEDICAL_NECESSITY_AUTHORITY_RULES.some((r) => r.includes("Never invent diagnoses")));
  assert.ok(MEDICAL_NECESSITY_AUTHORITY_RULES.some((r) => r.includes("Unsupported clinical")));
});

test("medical necessity pricing exposes honest packet variables", () => {
  assert.equal(MEDICAL_NECESSITY_PRICING.includedResponsePages, 4);
  assert.ok(MEDICAL_NECESSITY_PRICING.preparationFee >= 2499);
  assert.ok(MEDICAL_NECESSITY_PRICING.supportingPagePrice > 0);
  assert.ok(MEDICAL_NECESSITY_PRICING.certifiedMail > MEDICAL_NECESSITY_PRICING.standardMail);
  assert.ok(MEDICAL_NECESSITY_PRICING.registeredMail > MEDICAL_NECESSITY_PRICING.certifiedMail);
});
