import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceMailingOrder,
  createMailingOrderState,
} from "../src/mailing-order.js";

const draft = {
  workflowId: "appeal-insurance-denial",
  matterId: "matter-1",
  documentId: "packet-1",
  recipient: {
    name: "Appeals Department",
    line1: "1 Main St",
    city: "Example",
    state: "CA",
    postal: "95501",
  },
  mailingClass: "certified" as const,
  idempotencyKey: "matter-1:packet-1:v1",
};

test("mailing order requires idempotency and provider-backed submission", () => {
  const state = createMailingOrderState(draft, "2026-09-17T20:30:00.000Z");
  assert.equal(state.status, "draft");
  assert.throws(
    () => advanceMailingOrder(state, { status: "submitted" }),
    /providerOrderId/,
  );

  const submitted = advanceMailingOrder(state, {
    status: "submitted",
    providerOrderId: "lob_123",
  });
  const mailed = advanceMailingOrder(submitted, {
    status: "mailed",
    trackingNumber: "9400",
  });
  assert.equal(mailed.providerOrderId, "lob_123");
  assert.equal(mailed.trackingNumber, "9400");
});

test("mailing order rejects invalid US recipient data and invalid state jumps", () => {
  assert.throws(() => createMailingOrderState({
    ...draft,
    recipient: { ...draft.recipient, postal: "955" },
  }), /ZIP/);

  const state = createMailingOrderState(draft);
  assert.throws(
    () => advanceMailingOrder(state, { status: "delivered", providerOrderId: "lob_123" }),
    /Invalid mailing order transition/,
  );
});
