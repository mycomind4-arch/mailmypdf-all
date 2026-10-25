import assert from "node:assert/strict";
import test from "node:test";
import { calculateTotalPrice, registerVerticalPricing } from "../src/lib/pricing.ts";

test("core mailing rejects malformed page counts before calculating a charge", () => {
  for (const pageCount of [0, -1, -100, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => calculateTotalPrice({ pageCount, color: true, mailClass: "standard" }),
      /pageCount must be a positive safe integer/,
      `invalid page count ${String(pageCount)} must not be priced`,
    );
  }
});

test("core mailing rejects unknown mail classes rather than silently using standard postage", () => {
  assert.throws(
    () => calculateTotalPrice({ pageCount: 1, color: false, mailClass: "express" as never }),
    /Unsupported mailClass/,
  );
});

test("valid core mailing totals still include page tier, color, and service upgrade", () => {
  assert.equal(calculateTotalPrice({ pageCount: 1, color: false, mailClass: "standard" }), 299);
  assert.equal(calculateTotalPrice({ pageCount: 5, color: false, mailClass: "standard" }), 399);
  assert.equal(calculateTotalPrice({ pageCount: 1, color: true, mailClass: "certified" }), 1114);
});

test("invalid vertical pricing cannot produce a negative checkout amount", () => {
  const verticalSlug = "qa-invalid-total-regression";
  registerVerticalPricing({ verticalSlug, processingFeeCents: -10_000 });
  assert.throws(
    () => calculateTotalPrice({
      pageCount: 1,
      color: false,
      mailClass: "standard",
      vertical: { vertical_slug: verticalSlug, workflow: "test-only" },
    }),
    /Calculated price must be a non-negative safe integer/,
  );
});
