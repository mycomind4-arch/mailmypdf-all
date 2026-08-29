import test from "node:test";
import assert from "node:assert/strict";
import { MEDICAL_INSURANCE_DENIAL_GOLD, MEDICAL_INSURANCE_DENIAL_PRICING } from "../src/domain/medical-insurance-denial-gold";
import { calculateMedicalInsuranceDenialTotal } from "../src/routes/api/workflows/medical-insurance-denial/checkout";

test("Workflow #26 exposes the locked authority and pricing contract", () => {
  assert.equal(MEDICAL_INSURANCE_DENIAL_GOLD.workflowId, "medical-insurance-denial");
  assert.equal(MEDICAL_INSURANCE_DENIAL_GOLD.lifecycle, "authority");
  assert.ok(MEDICAL_INSURANCE_DENIAL_GOLD.capabilities.includes("independent-validation"));
  assert.ok(MEDICAL_INSURANCE_DENIAL_GOLD.capabilities.includes("human-approval"));
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.preparationFee, 29.99);
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.includedResponsePages, 4);
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.supportingPagePrice, 0.25);
});

test("Workflow #26 pricing charges only for response pages beyond inclusion plus supporting sheets and mailing", () => {
  const quote = calculateMedicalInsuranceDenialTotal({ mailingMethod: "certified", responseSheets: 6, supportingSheets: 2 });
  assert.equal(quote.preparationFee, 2999);
  assert.equal(quote.responseOverage, 90);
  assert.equal(quote.supportingDocuments, 50);
  assert.equal(quote.mailing, 1249);
  assert.equal(quote.largePacket, 0);
  assert.equal(quote.total, 4388);
});

test("Workflow #26 applies large-packet fee when threshold is reached", () => {
  const quote = calculateMedicalInsuranceDenialTotal({ mailingMethod: "standard", responseSheets: 5, supportingSheets: 2 });
  assert.equal(quote.largePacket, 250);
});
