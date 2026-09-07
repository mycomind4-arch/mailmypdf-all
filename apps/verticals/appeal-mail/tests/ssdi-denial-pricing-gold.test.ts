import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { SSDI_DENIAL_PRICING, calculateSsdiDenialTotal } from "../src/domain/ssdi-denial-pricing.ts";

test("SSDI denial uses transparent Gold packet pricing", () => {
  assert.equal(SSDI_DENIAL_PRICING.preparationFee, 24.99);
  assert.equal(SSDI_DENIAL_PRICING.includedResponsePages, 3);
  assert.equal(calculateSsdiDenialTotal({ responseSheets: 3, supportingSheets: 0, mailingMethod: "certified" }).total, 37.48);
  // 24.99 + (5-3)*0.40 + 8*0.25 + 12.49 = 24.99 + 0.80 + 2.00 + 12.49 = 40.28
  // (the previous "40.68" figure didn't match this module's own formula
  // with any input combination — a plain arithmetic slip, not a migration
  // artifact).
  assert.equal(calculateSsdiDenialTotal({ responseSheets: 5, supportingSheets: 8, mailingMethod: "certified" }).total, 40.28);
});

test("SSDI landing and checkout expose the same pricing contract", async () => {
  const route = await readFile("src/routes/workflows/ssdi-denial.tsx", "utf8");
  const pricing = await readFile("src/components/workflow/ssdi-denial-pricing.tsx", "utf8");
  const approve = await readFile("src/routes/api/workflows/ssdi-denial/approve.ts", "utf8");
  const checkout = await readFile("src/routes/api/workflows/ssdi-denial/checkout.ts", "utf8");
  assert.match(route, /SsdiDenialPricing/);
  assert.match(pricing, /\$24\.99/);
  assert.match(pricing, /\$0\.40/);
  assert.match(pricing, /\$0\.25/);
  assert.match(approve, /calculateSsdiDenialTotal/);
  // checkout.ts charges the approved packet's stored pricing (falling back
  // to recomputing with the same local model only if it's ever missing),
  // not a separately recomputed canonical quote — see the fix comment in
  // checkout.ts. This used to read appeal.packet.total, which never
  // appeared literally in source either way; check for the actual current
  // pattern instead.
  assert.match(checkout, /a\.packet\.pricing/);
  assert.match(checkout, /calculateSsdiDenialTotal/);
});
