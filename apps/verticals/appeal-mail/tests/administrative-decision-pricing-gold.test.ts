import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  ADMINISTRATIVE_DECISION_PRICING,
  calculateAdministrativeDecisionTotal,
} from "../src/domain/administrative-decision-pricing.ts";

test("administrative-decision uses transparent Gold packet pricing", () => {
  assert.equal(ADMINISTRATIVE_DECISION_PRICING.preparationFee, 0);
  assert.equal(ADMINISTRATIVE_DECISION_PRICING.includedResponsePages, 3);
  assert.equal(
    calculateAdministrativeDecisionTotal({
      responseSheets: 3,
      supportingSheets: 0,
      mailingMethod: "certified",
    }).total,
    14.94,
  );
  assert.equal(
    calculateAdministrativeDecisionTotal({
      responseSheets: 5,
      supportingSheets: 8,
      mailingMethod: "certified",
    }).total,
    14.94,
  );
});

test("administrative-decision landing, approval, and checkout use the same pricing model", async () => {
  const route = await readFile(
    "src/routes/workflows/administrative-decision.tsx",
    "utf8",
  );
  const pricing = await readFile(
    "src/components/workflow/administrative-decision-pricing.tsx",
    "utf8",
  );
  const approval = await readFile(
    "src/routes/api/workflows/administrative-decision/approve.ts",
    "utf8",
  );
  const checkout = await readFile(
    "src/routes/api/workflows/administrative-decision/checkout.ts",
    "utf8",
  );
  assert.match(route, /AdministrativeDecisionPricing/);
  assert.doesNotMatch(pricing, /24\.99|0\.40|0\.25/);
  assert.match(approval, /calculateQuote/);
  assert.match(checkout, /quote\.totalCents/);
});
