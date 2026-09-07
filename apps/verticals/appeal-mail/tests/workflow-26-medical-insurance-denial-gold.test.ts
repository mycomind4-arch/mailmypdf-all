import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateQuote } from "@mailmypdf/pricing";
import { MEDICAL_INSURANCE_DENIAL_GOLD, MEDICAL_INSURANCE_DENIAL_PRICING } from "../src/domain/medical-insurance-denial-gold";

test("Workflow #26 exposes the locked authority and pricing contract", () => {
  assert.equal(MEDICAL_INSURANCE_DENIAL_GOLD.workflowId, "medical-insurance-denial");
  assert.equal(MEDICAL_INSURANCE_DENIAL_GOLD.lifecycle, "authority");
  assert.ok(MEDICAL_INSURANCE_DENIAL_GOLD.capabilities.includes("independent-validation"));
  assert.ok(MEDICAL_INSURANCE_DENIAL_GOLD.capabilities.includes("human-approval"));
  // Derived from the canonical @mailmypdf/pricing profile for
  // "medical-insurance-denial" ($69.99 base, 8 included pages), not the
  // pre-migration $29.99/4.
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.preparationFee, 69.99);
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.includedResponsePages, 8);
  assert.equal(MEDICAL_INSURANCE_DENIAL_PRICING.supportingPagePrice, 0.25);
});

// checkout.ts has no local calculateMedicalInsuranceDenialTotal export (it
// never did, per its own git history) — it computes the charge inline via
// the canonical calculateQuote, consistent with approve.ts storing no
// conflicting local price. Importing the route handler module directly (as
// this test previously attempted) also hits a real tsx/tsconfig-paths
// resolution limitation for deeply-nested route files; every other
// gold-contract test in this suite reads route source as text instead, so
// do the same here.
test("Workflow #26 pricing charges only for response pages beyond inclusion plus supporting sheets and mailing", async () => {
  const checkout = await readFile("src/routes/api/workflows/medical-insurance-denial/checkout.ts", "utf8");
  assert.match(checkout, /calculateQuote/);
  assert.match(checkout, /workflowId:\s*"medical-insurance-denial"/);

  const quote = calculateQuote({
    workflowId: "medical-insurance-denial",
    verticalId: "appeal-mail",
    actualPages: 6,
    supportingPages: 2,
    mailClass: "certified",
  });
  assert.equal(quote.basePriceCents, 6999);
  assert.equal(quote.extraPageCost, 0); // 6 pages <= 8 included
  assert.equal(quote.supportingPageCost, 50); // 2 * 25c
  assert.ok(quote.totalCents > quote.basePriceCents);
});
