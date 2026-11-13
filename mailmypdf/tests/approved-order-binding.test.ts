import test from "node:test";
import assert from "node:assert/strict";
import { assertApprovedWorkflowOrderMatches, assertHostedCheckoutSessionMatches, workflowCheckoutAttemptKey, directCheckoutAttemptKey, assertWorkflowFulfillmentMatchesApproval } from "../src/lib/secure-core/approved-order-binding.ts";

const expected = {
  approvalId: "approval-1", caseId: "case-1", ownerId: "user-1",
  packetSha256: "a".repeat(64), totalCents: 499,
  email: "customer@example.test",
  sender: { name: "Sender", line1: "1 Main", line2: null, city: "Testville", state: "CA", postal: "90001" },
};
const validOrder = () => ({
  case_approval_id: expected.approvalId,
  workflow_case_id: expected.caseId,
  approved_packet_sha256: expected.packetSha256,
  approved_price_cents: expected.totalCents,
  price_cents: expected.totalCents,
  email: expected.email,
  sender_name: expected.sender.name,
  sender_line1: expected.sender.line1,
  sender_line2: null,
  sender_city: expected.sender.city,
  sender_state: expected.sender.state,
  sender_postal: expected.sender.postal,
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
    (order: ReturnType<typeof validOrder>) => { order.email = "different@example.test"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_name = "Different Sender"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_line1 = "999 Other St"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_line2 = "Suite X"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_city = "Elsewhere"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_state = "NY"; },
    (order: ReturnType<typeof validOrder>) => { order.sender_postal = "10001"; },
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

test("direct mail keeps original checkout key and creates distinct retry keys", async () => {
  const initial = await directCheckoutAttemptKey("order-1", null);
  const previous = await directCheckoutAttemptKey("order-1", "cs_expired_1");
  const repeat = await directCheckoutAttemptKey("order-1", "cs_expired_1");
  const next = await directCheckoutAttemptKey("order-1", "cs_expired_2");
  assert.equal(initial, "checkout_order-1");
  assert.notEqual(previous, initial);
  assert.equal(previous, repeat);
  assert.notEqual(next, previous);
  assert.match(previous, /^checkout_order-1_retry_[0-9a-f]{64}$/);
});

test("immutable workflow approval remains authoritative at the Lob send boundary", () => {
  const approval = {
    id: "approval-1",
    case_id: "case-1",
    owner_id: "user-1",
    packet_sha256: "a".repeat(64),
    recipient: { name: "Recipient", line1: "10 Main", line2: null, city: "Testville", state: "CA", postal: "90001" },
    mail_class: "standard",
    quote: { totalCents: 499 },
  };
  const order = () => ({
    case_approval_id: approval.id,
    workflow_case_id: approval.case_id,
    approved_packet_sha256: approval.packet_sha256,
    approved_price_cents: 499,
    price_cents: 499,
    email: "customer@example.test",
    recipient_name: approval.recipient.name,
    recipient_line1: approval.recipient.line1,
    recipient_line2: null as string | null,
    recipient_city: approval.recipient.city,
    recipient_state: approval.recipient.state,
    recipient_postal: approval.recipient.postal,
    sender_name: "Sender",
    sender_line1: "1 Sender Road",
    sender_line2: null as string | null,
    sender_city: "Sender City",
    sender_state: "CA",
    sender_postal: "90210",
    mail_class: "standard",
    color: false,
    vertical_metadata: {
      source: "secure-workflow",
      owner_user_id: approval.owner_id,
      case_approval_id: approval.id,
      workflow_case_id: approval.case_id,
      approved_packet_sha256: approval.packet_sha256,
      billing_email: "customer@example.test",
      sender_snapshot: {
        name: "Sender",
        line1: "1 Sender Road",
        line2: null as string | null,
        city: "Sender City",
        state: "CA",
        postal: "90210",
      },
    },
  });
  assert.doesNotThrow(() => assertWorkflowFulfillmentMatchesApproval(order(), approval));
  assert.throws(() => assertWorkflowFulfillmentMatchesApproval(order(), null), /submission blocked/);
  const tamper = [
    (o: ReturnType<typeof order>) => { o.recipient_name = "Redirected"; },
    (o: ReturnType<typeof order>) => { o.recipient_line1 = "100 Stolen Road"; },
    (o: ReturnType<typeof order>) => { o.recipient_line2 = "Suite 10"; },
    (o: ReturnType<typeof order>) => { o.recipient_city = "Other City"; },
    (o: ReturnType<typeof order>) => { o.recipient_state = "NY"; },
    (o: ReturnType<typeof order>) => { o.recipient_postal = "10001"; },
    (o: ReturnType<typeof order>) => { o.sender_name = "Wrong Sender"; },
    (o: ReturnType<typeof order>) => { o.sender_line1 = "100 Wrong Road"; },
    (o: ReturnType<typeof order>) => { o.sender_line2 = "Suite 10"; },
    (o: ReturnType<typeof order>) => { o.sender_city = "Different City"; },
    (o: ReturnType<typeof order>) => { o.sender_state = "NY"; },
    (o: ReturnType<typeof order>) => { o.sender_postal = "10001"; },
    (o: ReturnType<typeof order>) => { o.email = "other@example.test"; },
    (o: ReturnType<typeof order>) => { o.mail_class = "certified"; },
    (o: ReturnType<typeof order>) => { o.color = true; },
    (o: ReturnType<typeof order>) => { o.price_cents = 1; },
    (o: ReturnType<typeof order>) => { o.approved_price_cents = 1; },
    (o: ReturnType<typeof order>) => { o.approved_packet_sha256 = "b".repeat(64); },
    (o: ReturnType<typeof order>) => { o.case_approval_id = "other"; },
    (o: ReturnType<typeof order>) => { o.workflow_case_id = "other"; },
    (o: ReturnType<typeof order>) => { o.vertical_metadata.owner_user_id = "wrong"; },
    (o: ReturnType<typeof order>) => { o.vertical_metadata.sender_snapshot.city = "Altered"; },
  ];
  for (const mutate of tamper) {
    const changed = order();
    mutate(changed);
    assert.throws(() => assertWorkflowFulfillmentMatchesApproval(changed, approval), /submission blocked/);
  }
});
