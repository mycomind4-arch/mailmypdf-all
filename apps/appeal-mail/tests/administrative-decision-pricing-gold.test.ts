import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { ADMINISTRATIVE_DECISION_PRICING, calculateAdministrativeDecisionTotal } from "../src/domain/administrative-decision-pricing.ts";

test("administrative-decision uses transparent Gold packet pricing", () => {
  assert.equal(ADMINISTRATIVE_DECISION_PRICING.preparationFee, 24.99);
  assert.equal(ADMINISTRATIVE_DECISION_PRICING.includedResponsePages, 3);
  assert.equal(calculateAdministrativeDecisionTotal({ responseSheets: 3, supportingSheets: 0, mailingMethod: "certified" }).total, 37.48);
  assert.equal(calculateAdministrativeDecisionTotal({ responseSheets: 5, supportingSheets: 8, mailingMethod: "certified" }).total, 40.68);
});

test("administrative-decision landing, approval, and checkout use the same pricing model", async () => {
  const route = await readFile("src/routes/workflows/administrative-decision.tsx", "utf8");
  const pricing = await readFile("src/components/workflow/administrative-decision-pricing.tsx", "utf8");
  const approval = await readFile("src/routes/api/workflows/administrative-decision/approve.ts", "utf8");
  const checkout = await readFile("src/routes/api/workflows/administrative-decision/checkout.ts", "utf8");
  assert.match(route, /AdministrativeDecisionPricing/);
  assert.match(pricing, /\$24\.99/);
  assert.match(pricing, /\$0\.40/);
  assert.match(pricing, /\$0\.25/);
  assert.match(approval, /calculateAdministrativeDecisionTotal/);
  assert.match(checkout, /pricing\.total/);
});
