import assert from "node:assert/strict";
import test from "node:test";
import { attemptTransition } from "../src/lib/order-state-machine";

test("scheduled saved payment may advance draft only with verified payment intent metadata", () => {
  const allowed = attemptTransition({
    from: "draft",
    to: "paid_pending_manual_fulfillment",
    triggeredBy: "scheduled_job",
    metadata: { payment_intent_id: "pi_123" },
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.event, "payment.received");
});

test("user/system callers cannot bypass checkout through the scheduled-payment transition", () => {
  for (const triggeredBy of ["user", "system", "admin", "auto_submit"] as const) {
    const result = attemptTransition({
      from: "draft",
      to: "paid_pending_manual_fulfillment",
      triggeredBy,
      metadata: { payment_intent_id: "pi_123" },
    });
    assert.equal(result.ok, false, triggeredBy);
  }
});

test("scheduled payment transition fails without a Stripe payment intent id", () => {
  const result = attemptTransition({
    from: "draft",
    to: "paid_pending_manual_fulfillment",
    triggeredBy: "scheduled_job",
    metadata: {},
  });
  assert.equal(result.ok, false);
});
