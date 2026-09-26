import assert from "node:assert/strict";
import test from "node:test";
import { assessPreFilingSearchResult, composePreFilingSearch } from "../workflow-composition";

test("pre-filing search keeps exact-name coverage and no-hit uncertainty visible", () => {
  const plan = composePreFilingSearch({
    jurisdiction: { country: "US", state: "DE" },
    authoritativeDebtorName: "Example Debtor LLC",
    allowedVariantKinds: ["exact-authoritative"],
  });
  assert.equal(plan.status, "ready-for-search");
  assert.equal(plan.plan.steps[0]?.variantKind, "exact-authoritative");

  const result = assessPreFilingSearchResult({
    rawRecords: [],
    provenance: { provider: "fixture", jurisdiction: "DE", queriedAt: "2026-09-25T00:00:00Z", query: "Example Debtor LLC" },
    complete: true,
  });
  assert.equal(result.status, "human-review-required");
  assert.equal(result.coverage.noHitConclusive, false);
  assert.equal(result.consequentialActionAllowed, false);
});
