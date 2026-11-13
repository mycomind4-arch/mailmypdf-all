import test from "node:test";
import assert from "node:assert/strict";
import { assertApprovedWorkflowOrderMatches, assertHostedCheckoutSessionMatches, workflowCheckoutAttemptKey } from "../src/lib/secure-core/approved-order-binding.ts";

const expected = {
  approvalId: "approval-1", caseId: "case-1", ownerId: "user-1",
  packetSha256: "a".repeat(64), totalCents: 499,
};
const validOrder = () => ({
  case_approval_id: expected.approvalId,
  workflow_case_id: expected.caseId,
  approved_packet_sha256: expected.packetSha256,
  approved_price_cents: expected.totalCents,
  price_cents: expected.totalCents,
  vertical_metadata: {
    source: "secure-workflow",
    owner_user_id: expected.ownerId,
    workflow_case_id: expected.caseId,
    case_approval_id: expected.approvalId,
    approved_packet_sha256: expected.packetSha256,
  },
});

test("exact owner, approval, matter, immutable digest and amount permit reuse", () => {
  assert.doesNotThrow(() => assertApprovedWorkflowOrderMatches(validOrder(), expected));
});

test("reused or unique-race order fails closed on every corrupted binding", () => {
  const mutations = [
    (order: ReturnType<typeof validOrder>) => { order.case_approval_id = "other"; },
    (order: ReturnType<typeof validOrder>) => { order.workflow_case_id = "other"; },
    (order: ReturnType<typeof validOrder>) => { order.approved_packet_sha256 = "b".repeat(64); },
    (order: ReturnType<typeof validOrder>) => { order.approved_price_cents = 500; },
    (order: ReturnType<typeof validOrder>) => { order.price_cents = 500; },
    (order: ReturnType<typeof validOrder>) => { order.vertical_metadata.source = "another-source"; },
    (order: ReturnType<typeof validOrder>) => { order.vertical_metadata.owner_user_id = "user-2"; },
    (order: ReturnType<typeof validOrder>) => { order.vertical_metadata.workflow_case_id = "other"; },
    (order: ReturnType<typeof validOrder>) => { order.vertical_metadata.case_approval_id = "other"; },
    (order: ReturnType<typeof validOrder>) => { order.vertical_metadata.approved_packet_sha256 = "b".repeat(64); },
  ];
  for (const change of mutations) {
    const order = validOrder();
    change(order);
    assert.throws(() => assertApprovedWorkflowOrderMatches(order, expected), /authenticated approved packet/);
  }
  assert.throws(() => assertApprovedWorkflowOrderMatches({
    ...validOrder(), vertical_metadata: null,
  }, expected), /authenticated approved packet/);
});

test("Stripe hosted checkout cannot be reused for another order, amount or approval", () => {
  const order = { id: "order-1", price_cents: 499 };
  const session = {
    id: "cs_test_1", mode: "payment", status: "open", amount_total: 499, currency: "usd",
    metadata: { orderId: "order-1", workflowCaseId: "case-1", caseApprovalId: "approval-1" },
  };
  assert.doesNotThrow(() => assertHostedCheckoutSessionMatches(session, order, "approval-1", "case-1"));
  assert.throws(() => assertHostedCheckoutSessionMatches(session, { ...order, id: "other" }, "approval-1", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches({ ...session, amount_total: 500 }, order, "approval-1", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches({ ...session, currency: "eur" }, order, "approval-1", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches({ ...session, mode: "subscription" }, order, "approval-1", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches({ ...session, metadata: null }, order, "approval-1", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches(session, order, "approval-2", "case-1"), /does not match/);
  assert.throws(() => assertHostedCheckoutSessionMatches(session, order, "approval-1", "case-2"), /does not match/);
});

test("expired Stripe checkout retry gets a new deterministic idempotency key", async () => {
  const initial = await workflowCheckoutAttemptKey("approval-1", null);
  const retry1 = await workflowCheckoutAttemptKey("approval-1", "cs_expired_1");
  const retry1Concurrent = await workflowCheckoutAttemptKey("approval-1", "cs_expired_1");
  const retry2 = await workflowCheckoutAttemptKey("approval-1", "cs_expired_2");
  assert.match(initial, /^workflow_checkout_approval-1$/);
  assert.equal(retry1, retry1Concurrent);
  assert.notEqual(retry1, initial);
  assert.notEqual(retry2, retry1);
  assert.ok(retry1.length < 255);
});
