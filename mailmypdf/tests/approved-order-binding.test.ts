import test from "node:test";
import assert from "node:assert/strict";
import { assertApprovedWorkflowOrderMatches } from "../src/lib/secure-core/approved-order-binding.ts";

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
