import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBatchMailingPrice,
  DEFAULT_BATCH_DISCOUNT_POLICY,
} from "../src/batch-pricing.js";

test("single-piece mailing receives no batch discount", () => {
  assert.deepEqual(calculateBatchMailingPrice({ unitPriceCents: 299, quantity: 1 }), {
    quantity: 1,
    unitPriceCents: 299,
    subtotalCents: 299,
    discountBps: 0,
    discountCents: 0,
    totalCents: 299,
  });
});

test("default batch policy applies the highest reached tier", () => {
  const quote = calculateBatchMailingPrice({ unitPriceCents: 299, quantity: 10 });
  assert.equal(quote.discountBps, 2500);
  assert.equal(quote.subtotalCents, 2990);
  assert.equal(quote.discountCents, 747);
  assert.equal(quote.totalCents, 2243);
  assert.equal(DEFAULT_BATCH_DISCOUNT_POLICY.tiers.length, 3);
});

test("server can supply a different discount policy without changing connector code", () => {
  const quote = calculateBatchMailingPrice({
    unitPriceCents: 1000,
    quantity: 3,
    policy: { tiers: [{ minPieces: 3, discountBps: 750 }] },
  });
  assert.equal(quote.discountBps, 750);
  assert.equal(quote.totalCents, 2775);
});

test("invalid discount tiers fail closed", () => {
  assert.throws(() => calculateBatchMailingPrice({
    unitPriceCents: 1000,
    quantity: 2,
    policy: { tiers: [{ minPieces: 2, discountBps: 10001 }] },
  }), /Invalid batch discount tier/);
});
