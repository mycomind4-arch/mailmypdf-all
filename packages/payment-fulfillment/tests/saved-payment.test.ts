import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSavedPaymentCharge,
  chargeApprovedSavedPayment,
  toPublicSavedPaymentSummary,
  type SavedPaymentMethod,
} from "../src/saved-payment.js";

const method: SavedPaymentMethod = {
  provider: "stripe",
  customerRef: "cus_internal",
  paymentMethodRef: "pm_internal",
  brand: "Visa",
  last4: "4242",
  ready: true,
  updatedAt: "2026-09-28T02:00:00.000Z",
};
const hash = "a".repeat(64);

test("public saved-payment summary never exposes provider references", () => {
  const summary = toPublicSavedPaymentSummary(method);
  assert.deepEqual(summary, {
    ready: true,
    display: "Visa •••• 4242",
    brand: "Visa",
    last4: "4242",
  });
  assert.equal("customerRef" in summary, false);
  assert.equal("paymentMethodRef" in summary, false);
});

test("saved payment charge requires explicit user authorization", () => {
  assert.equal(assessSavedPaymentCharge({
    method,
    userAuthorizedCharge: false,
    approvalCurrent: true,
    approvedPacketSha256: hash,
    currentPacketSha256: hash,
    approvedMaxTotalCents: 1000,
    currentTotalCents: 1000,
  }).code, "USER_AUTHORIZATION_REQUIRED");
});

test("saved payment permits lower price but blocks a higher price or changed packet", () => {
  const base = {
    method,
    userAuthorizedCharge: true,
    approvalCurrent: true,
    approvedPacketSha256: hash,
    approvedMaxTotalCents: 1000,
  };
  assert.deepEqual(assessSavedPaymentCharge({
    ...base,
    currentPacketSha256: hash,
    currentTotalCents: 900,
  }), { ready: true, code: "READY", amountCents: 900 });

  assert.equal(assessSavedPaymentCharge({
    ...base,
    currentPacketSha256: hash,
    currentTotalCents: 1001,
  }).code, "PRICE_INCREASE_REAPPROVAL");

  assert.equal(assessSavedPaymentCharge({
    ...base,
    currentPacketSha256: "b".repeat(64),
    currentTotalCents: 1000,
  }).code, "PACKET_CHANGED");
});

test("charge adapter receives internal refs only after all approval gates pass", async () => {
  let charged: unknown = null;
  const result = await chargeApprovedSavedPayment({
    method,
    userAuthorizedCharge: true,
    approvalCurrent: true,
    approvedPacketSha256: hash,
    currentPacketSha256: hash,
    approvedMaxTotalCents: 1000,
    currentTotalCents: 950,
    orderId: "order-1",
    approvalId: "approval-1",
    idempotencyKey: "saved-payment:approval-1",
    gateway: {
      async charge(input) {
        charged = input;
        return { paymentIntentId: "pi_test", status: "succeeded" };
      },
    },
  });
  assert.deepEqual(result, { paymentIntentId: "pi_test", status: "succeeded" });
  assert.deepEqual(charged, {
    customerRef: "cus_internal",
    paymentMethodRef: "pm_internal",
    amountCents: 950,
    currency: "usd",
    idempotencyKey: "saved-payment:approval-1",
    metadata: { orderId: "order-1", approvalId: "approval-1", packetSha256: hash },
  });
});
