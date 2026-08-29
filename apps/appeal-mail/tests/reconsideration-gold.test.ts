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
  assert.equal(RECONSIDERATION_PRICING.preparationFee, 19.99);
  assert.equal(calculateReconsiderationTotal({ responseSheets: 3, supportingSheets: 0, mailingMethod: "certified" }).total, 32.48);
  assert.equal(calculateReconsiderationTotal({ responseSheets: 5, supportingSheets: 8, mailingMethod: "certified" }).total, 37.68);
});

test("Workflow #22 landing page and checkout use final packet pricing", async () => {
  const route = await readFile("src/routes/workflows/reconsideration.tsx", "utf8");
  const pricing = await readFile("src/components/workflow/reconsideration-pricing.tsx", "utf8");
  const approve = await readFile("src/routes/api/workflows/reconsideration/approve.ts", "utf8");
  const checkout = await readFile("src/routes/api/workflows/reconsideration/checkout.ts", "utf8");
  assert.match(route, /ReconsiderationPricing/);
  assert.match(pricing, /\$19\.99/);
  assert.match(pricing, /\$0\.40/);
  assert.match(pricing, /\$0\.25/);
  assert.match(approve, /calculateReconsiderationTotal/);
  assert.match(approve, /packet:pricedPacket/);
  assert.match(checkout, /a\.packet\.total/);
});
