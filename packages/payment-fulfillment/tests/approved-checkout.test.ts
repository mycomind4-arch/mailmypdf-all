import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrLoadApprovalOrder,
  ensureApprovalCheckoutSession,
  type ApprovalBoundOrder,
  type ApprovalOrderStore,
  type ApprovedPacketForCheckout,
} from "../src/approved-checkout.js";

const packet: ApprovedPacketForCheckout = {
  approvalId: "approval-1",
  matterId: "matter-1",
  workflowId: "ssdi-denial",
  verticalId: "appeal-mail",
  packetSha256: "a".repeat(64),
  bytes: new Uint8Array([1, 2, 3]),
  responsePages: 2,
  supportingPages: 1,
  totalCents: 1494,
  mailClass: "certified",
  recipient: { name: "Agency" },
};

function order(overrides: Partial<ApprovalBoundOrder> = {}): ApprovalBoundOrder {
  return {
    id: "order-1",
    approvalId: packet.approvalId,
    matterId: packet.matterId,
    lookupToken: "lookup",
    stripeSessionId: null,
    status: "draft",
    priceCents: packet.totalCents,
    approvedPacketSha256: packet.packetSha256,
    approvedPriceCents: packet.totalCents,
    ...overrides,
  };
}

function baseStore(): ApprovalOrderStore {
  return {
    async loadByApproval() { return null; },
    async loadById() { return order(); },
    async create() { return { order: order() }; },
    async claimStripeSession() { return true; },
    async releaseStripeSession() { return true; },
  };
}

test("reconciles a concurrent one-approval/one-order race", async () => {
  let lookupCount = 0;
  let uploaded = false;
  let removed = "";
  const winner = order({ id: "winner" });
  const store: ApprovalOrderStore = {
    ...baseStore(),
    async loadByApproval() {
      lookupCount += 1;
      return lookupCount === 1 ? null : winner;
    },
    async create() { return { conflict: true }; },
  };

  const result = await createOrLoadApprovalOrder({
    packet,
    ownerId: "user-1",
    email: "user@example.test",
    sender: { name: "Sender" },
    store,
    vault: {
      async validatePdf() { return { pageCount: 3 }; },
      async upload() { uploaded = true; return { storagePath: "temp" }; },
      async remove(path) { removed = path; },
    },
  });

  assert.equal(result.id, "winner");
  assert.equal(uploaded, true);
  assert.equal(removed, "temp");
  assert.equal(lookupCount, 2);
});

test("fails closed if PDF recount differs from approved page totals", async () => {
  await assert.rejects(() => createOrLoadApprovalOrder({
    packet,
    ownerId: "user-1",
    email: "user@example.test",
    sender: { name: "Sender" },
    store: baseStore(),
    vault: {
      async validatePdf() { return { pageCount: 99 }; },
      async upload() { throw new Error("must not upload"); },
      async remove() {},
    },
  }), /page count changed/i);
});

test("uses one stable Stripe idempotency key per approval", async () => {
  let idempotencyKey = "";
  const result = await ensureApprovalCheckoutSession({
    order: order(),
    approvalId: packet.approvalId,
    matterId: packet.matterId,
    workflowId: packet.workflowId,
    email: "user@example.test",
    successUrl: "https://example.test/success",
    cancelUrl: "https://example.test/cancel",
    store: baseStore(),
    stripe: {
      async retrieve() { throw new Error("not used"); },
      async create(input) {
        idempotencyKey = input.idempotencyKey;
        return { id: "cs_1", status: "open", url: "https://checkout.test/cs_1" };
      },
      async expire() {},
    },
  });

  assert.equal(idempotencyKey, `workflow_checkout_${packet.approvalId}`);
  assert.equal(result.sessionId, "cs_1");
});
