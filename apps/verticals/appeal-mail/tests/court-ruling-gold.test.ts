import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { COURT_RULING_PRICING, COURT_RULING_AUTHORITY_RULES, COURT_RULING_AUTHORITY_SOURCES } from "../src/domain/court-ruling-gold.ts";

test("workflow #21 has transparent court-ruling packet pricing", () => {
  assert.equal(COURT_RULING_PRICING.preparationFee, 29.99);
  assert.equal(COURT_RULING_PRICING.includedResponsePages, 4);
  assert.equal(COURT_RULING_AUTHORITY_SOURCES.length, 4);
  assert.ok(COURT_RULING_AUTHORITY_RULES.some((x) => x.includes("Never infer a filing deadline")));
});

test("workflow #21 landing page exposes pricing and authority", async () => {
  const route = await readFile("src/routes/workflows/court-ruling.tsx", "utf8");
  const pricing = await readFile("src/components/workflow/court-ruling-pricing.tsx", "utf8");
  const approve = await readFile("src/routes/api/workflows/court-ruling/approve.ts", "utf8");
  const checkout = await readFile("src/routes/api/workflows/court-ruling/checkout.ts", "utf8");
  assert.match(route, /CourtRulingPricing/);
  assert.match(pricing, /29\.99/);
  assert.match(approve, /packet\.total/);
  assert.match(checkout, /a\.packet\.total/);
});

test("workflow #21 protects against jurisdiction-specific guessing", async () => {
  const analyze = await readFile("src/routes/api/workflows/court-ruling/analyze.ts", "utf8");
  const draft = await readFile("src/routes/api/workflows/court-ruling/draft.ts", "utf8");
  assert.match(analyze, /Never invent jurisdiction-specific law/);
  assert.match(draft, /Do not invent legal authority/);
});
