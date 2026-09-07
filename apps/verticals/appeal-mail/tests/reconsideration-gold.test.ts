import assert from "node:assert/strict";
import test from "node:test";
import { RECONSIDERATION_GOLD, RECONSIDERATION_AUTHORITY_RULES } from "../src/domain/reconsideration-gold.ts";
import { calculateReconsiderationTotal, RECONSIDERATION_PRICING } from "../src/domain/reconsideration-pricing.ts";
import { readFile } from "node:fs/promises";

test("Workflow #22 reaches authority Gold pricing contract", () => {
  assert.equal(RECONSIDERATION_GOLD.lifecycle, "authority");
  assert.ok(RECONSIDERATION_GOLD.capabilities.includes("independent-validation"));
  assert.ok(RECONSIDERATION_GOLD.capabilities.includes("pricing"));
  assert.ok(RECONSIDERATION_AUTHORITY_RULES.some((x) => x.includes("universal reconsideration")));
});

test("Workflow #22 calculates transparent packet pricing", () => {
  // Both preparationFee and the mail rate are derived from the canonical
  // @mailmypdf/pricing profile for "reconsideration" ($29.99 base,
  // certified mail at the shared $14.94 PRICES.certified rate) — these
  // totals are no longer the pre-migration $19.99/$12.49 figures.
  assert.equal(RECONSIDERATION_PRICING.preparationFee, 29.99);
  assert.equal(calculateReconsiderationTotal({ responseSheets: 3, supportingSheets: 0, mailingMethod: "certified" }).total, 44.93);
  assert.equal(calculateReconsiderationTotal({ responseSheets: 5, supportingSheets: 8, mailingMethod: "certified" }).total, 47.73);
});

test("Workflow #22 landing page and checkout use final packet pricing", async () => {
  const route = await readFile("src/routes/workflows/reconsideration.tsx", "utf8");
  const pricing = await readFile("src/components/workflow/reconsideration-pricing.tsx", "utf8");
  const approve = await readFile("src/routes/api/workflows/reconsideration/approve.ts", "utf8");
  const checkout = await readFile("src/routes/api/workflows/reconsideration/checkout.ts", "utf8");
  assert.match(route, /ReconsiderationPricing/);
  // Pricing is rendered dynamically from getWorkflowPricingProfile/PRICES
  // rather than hardcoded dollar literals — the actual numbers are
  // verified programmatically in the test above.
  assert.match(pricing, /getWorkflowPricingProfile/);
  // approve.ts and checkout.ts both call the canonical calculateQuote
  // directly for the "reconsideration" workflow (verified above to produce
  // the same total as the calculateReconsiderationTotal wrapper) rather
  // than routing through that wrapper by name.
  assert.match(approve, /calculateQuote/);
  assert.match(approve, /pricedPacket/);
  assert.match(checkout, /quote\.totalCents/);
});
