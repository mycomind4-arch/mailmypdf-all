/**
 * TEST-ONLY helper. Never import this from production code.
 *
 * Immigration workflows are intentionally withheld from sale
 * (commercialStatus !== "production") until an attorney has reviewed them, so
 * the canonical engine's calculateQuote() refuses to quote them. The tests
 * that import this file exercise the RFE pricing MATH and the 27-stage
 * certification pipeline, which are independent of that commercial gate.
 *
 * It flips the in-memory profile status for the lifetime of the importing test
 * file and restores it afterwards, so the REAL pricing engine still does the
 * arithmetic (no re-implemented math to drift from production).
 *
 * The gate itself is covered separately by:
 *   - packages/pricing/tests/regression-suite.test.ts ("Immigration-mail legal-risk gate")
 *   - tests/mailmypdf-gold-contract.test.ts (checkout refuses gated workflows)
 */
import { afterAll, beforeAll } from "vitest";
import { getAllPricingProfiles } from "@mailmypdf/pricing";

type MutableProfile = { verticalId: string; commercialStatus: string };

const original = new Map<MutableProfile, string>();

beforeAll(() => {
  for (const p of getAllPricingProfiles() as readonly MutableProfile[]) {
    if (p.verticalId === "immigration-mail") {
      original.set(p, p.commercialStatus);
      p.commercialStatus = "production";
    }
  }
});

afterAll(() => {
  for (const [p, status] of original) p.commercialStatus = status;
  original.clear();
});
