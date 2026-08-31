import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the order state machine transition logic.
// We inline the transition table to test the logic without importing the TS module
// (which has dependencies on the Supabase types).

// ── Inline copy of ALLOWED_TRANSITIONS from src/lib/order-state-machine.ts ─────

const ALLOWED_TRANSITIONS = {
  // Legacy statuses
  paid: ["submitted_to_provider", "manual_fulfillment_in_progress", "failed_fulfillment", "cancelled", "refunded"],
  failed: ["paid_pending_manual_fulfillment", "cancelled", "refunded"],

  draft: ["checkout_created", "failed_payment", "cancelled", "priced", "uploaded"],
  uploaded: ["priced", "cancelled"],
  priced: ["checkout_created", "cancelled"],
  checkout_created: ["paid_pending_manual_fulfillment", "failed_payment", "cancelled", "draft"],
  paid_pending_manual_fulfillment: ["submitted_to_provider", "manual_fulfillment_in_progress", "failed_fulfillment", "cancelled", "refunded"],
  manual_fulfillment_in_progress: ["submitted_to_provider", "failed_fulfillment", "cancelled", "refunded"],
  submitted_to_provider: ["provider_processing", "failed_provider_submission", "cancelled", "refunded"],
  provider_processing: ["mailed", "failed_provider_submission", "cancelled", "refunded"],
  mailed: ["in_transit", "delivered", "returned", "refunded"],
  in_transit: ["delivered", "returned", "refunded"],
  delivered: ["returned", "refunded"],
  returned: ["refunded"],
  failed_payment: ["draft", "cancelled"],
  failed_fulfillment: ["paid_pending_manual_fulfillment", "manual_fulfillment_in_progress", "cancelled", "refunded"],
  failed_provider_submission: ["paid_pending_manual_fulfillment", "submitted_to_provider", "manual_fulfillment_in_progress", "cancelled", "refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function isTerminalStatus(status) {
  const next = ALLOWED_TRANSITIONS[status] || [];
  return next.length === 0 || (next.length === 1 && next[0] === "refunded");
}

function isPaidStatus(status) {
  return [
    "paid_pending_manual_fulfillment",
    "manual_fulfillment_in_progress",
    "submitted_to_provider",
    "provider_processing",
    "mailed",
    "in_transit",
    "delivered",
    "returned",
    "refunded",
  ].includes(status);
}

function isFailedStatus(status) {
  return ["failed_payment", "failed_fulfillment", "failed_provider_submission"].includes(status);
}

function isSubmittableStatus(status) {
  return [
    "paid_pending_manual_fulfillment",
    "failed_fulfillment",
    "failed_provider_submission",
    "manual_fulfillment_in_progress",
  ].includes(status);
}

function isRefundableStatus(status) {
  return (ALLOWED_TRANSITIONS[status] || []).includes("refunded");
}

const FULFILLMENT_PIPELINE = [
  "paid_pending_manual_fulfillment",
  "submitted_to_provider",
  "provider_processing",
  "mailed",
  "in_transit",
  "delivered",
];

function getFulfillmentProgress(status) {
  return FULFILLMENT_PIPELINE.indexOf(status);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Order State Machine — Transition Table", () => {
  it("allows draft → checkout_created", () => {
    assert.ok(canTransition("draft", "checkout_created"));
  });

  it("allows checkout_created → paid_pending_manual_fulfillment", () => {
    assert.ok(canTransition("checkout_created", "paid_pending_manual_fulfillment"));
  });

  it("allows paid_pending_manual_fulfillment → submitted_to_provider", () => {
    assert.ok(canTransition("paid_pending_manual_fulfillment", "submitted_to_provider"));
  });

  it("allows submitted_to_provider → provider_processing", () => {
    assert.ok(canTransition("submitted_to_provider", "provider_processing"));
  });

  it("allows provider_processing → mailed", () => {
    assert.ok(canTransition("provider_processing", "mailed"));
  });

  it("allows mailed → in_transit", () => {
    assert.ok(canTransition("mailed", "in_transit"));
  });

  it("allows in_transit → delivered", () => {
    assert.ok(canTransition("in_transit", "delivered"));
  });

  it("allows delivered → returned", () => {
    assert.ok(canTransition("delivered", "returned"));
  });

  it("blocks draft → paid_pending_manual_fulfillment (must go through checkout)", () => {
    assert.ok(!canTransition("draft", "paid_pending_manual_fulfillment"));
  });

  it("blocks delivered → draft (no going back)", () => {
    assert.ok(!canTransition("delivered", "draft"));
  });

  it("blocks mailed → draft", () => {
    assert.ok(!canTransition("mailed", "draft"));
  });

  it("blocks draft → submitted_to_provider (must be paid first)", () => {
    assert.ok(!canTransition("draft", "submitted_to_provider"));
  });
});

describe("Order State Machine — Refunds & Cancellations", () => {
  it("allows refund from any paid state", () => {
    const paidStates = [
      "paid_pending_manual_fulfillment",
      "manual_fulfillment_in_progress",
      "submitted_to_provider",
      "provider_processing",
      "mailed",
      "in_transit",
      "delivered",
      "returned",
    ];
    for (const state of paidStates) {
      assert.ok(canTransition(state, "refunded"), `${state} → refunded should be allowed`);
    }
  });

  it("allows cancelled from pre-fulfillment states", () => {
    const cancellable = [
      "draft",
      "uploaded",
      "priced",
      "checkout_created",
      "paid_pending_manual_fulfillment",
      "manual_fulfillment_in_progress",
      "submitted_to_provider",
      "provider_processing",
    ];
    for (const state of cancellable) {
      assert.ok(canTransition(state, "cancelled"), `${state} → cancelled should be allowed`);
    }
  });

  it("does NOT allow cancelled from mailed/in_transit/delivered", () => {
    assert.ok(!canTransition("mailed", "cancelled"));
    assert.ok(!canTransition("in_transit", "cancelled"));
    assert.ok(!canTransition("delivered", "cancelled"));
  });
});

describe("Order State Machine — Recovery Paths", () => {
  it("allows retry from failed_fulfillment → paid_pending_manual_fulfillment", () => {
    assert.ok(canTransition("failed_fulfillment", "paid_pending_manual_fulfillment"));
  });

  it("allows retry from failed_provider_submission → submitted_to_provider", () => {
    assert.ok(canTransition("failed_provider_submission", "submitted_to_provider"));
  });

  it("allows failed_payment → draft (retry)", () => {
    assert.ok(canTransition("failed_payment", "draft"));
  });
});

describe("Order State Machine — Terminal States", () => {
  it("refunded is terminal", () => {
    assert.ok(isTerminalStatus("refunded"));
    assert.deepEqual(ALLOWED_TRANSITIONS.refunded, []);
  });

  it("draft is NOT terminal", () => {
    assert.ok(!isTerminalStatus("draft"));
  });

  it("cancelled IS terminal (only transition is refund)", () => {
    assert.ok(isTerminalStatus("cancelled"));
  });
});

describe("Order State Machine — Status Helpers", () => {
  it("isPaidStatus identifies paid states", () => {
    assert.ok(isPaidStatus("paid_pending_manual_fulfillment"));
    assert.ok(isPaidStatus("mailed"));
    assert.ok(isPaidStatus("delivered"));
    assert.ok(!isPaidStatus("draft"));
    assert.ok(!isPaidStatus("failed_payment"));
  });

  it("isFailedStatus identifies failed states", () => {
    assert.ok(isFailedStatus("failed_payment"));
    assert.ok(isFailedStatus("failed_fulfillment"));
    assert.ok(isFailedStatus("failed_provider_submission"));
    assert.ok(!isFailedStatus("draft"));
    assert.ok(!isFailedStatus("paid_pending_manual_fulfillment"));
  });

  it("isSubmittableStatus identifies submittable states", () => {
    assert.ok(isSubmittableStatus("paid_pending_manual_fulfillment"));
    assert.ok(isSubmittableStatus("failed_fulfillment"));
    assert.ok(isSubmittableStatus("failed_provider_submission"));
    assert.ok(isSubmittableStatus("manual_fulfillment_in_progress"));
    assert.ok(!isSubmittableStatus("draft"));
    assert.ok(!isSubmittableStatus("mailed"));
    assert.ok(!isSubmittableStatus("delivered"));
  });

  it("isRefundableStatus identifies refundable states", () => {
    assert.ok(isRefundableStatus("paid_pending_manual_fulfillment"));
    assert.ok(isRefundableStatus("mailed"));
    assert.ok(isRefundableStatus("delivered"));
    assert.ok(!isRefundableStatus("draft"));
  });

  it("getFulfillmentProgress returns increasing values", () => {
    assert.ok(getFulfillmentProgress("paid_pending_manual_fulfillment") < getFulfillmentProgress("submitted_to_provider"));
    assert.ok(getFulfillmentProgress("submitted_to_provider") < getFulfillmentProgress("provider_processing"));
    assert.ok(getFulfillmentProgress("provider_processing") < getFulfillmentProgress("mailed"));
    assert.ok(getFulfillmentProgress("mailed") < getFulfillmentProgress("in_transit"));
    assert.ok(getFulfillmentProgress("in_transit") < getFulfillmentProgress("delivered"));
  });

  it("getFulfillmentProgress returns -1 for non-pipeline statuses", () => {
    assert.equal(getFulfillmentProgress("draft"), -1);
    assert.equal(getFulfillmentProgress("failed_payment"), -1);
    assert.equal(getFulfillmentProgress("refunded"), -1);
  });
});

describe("Order State Machine — Full Lifecycle", () => {
  it("happy path: draft → checkout → paid → submitted → processing → mailed → in_transit → delivered", () => {
    const path = [
      "draft",
      "checkout_created",
      "paid_pending_manual_fulfillment",
      "submitted_to_provider",
      "provider_processing",
      "mailed",
      "in_transit",
      "delivered",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      assert.ok(canTransition(path[i], path[i + 1]), `${path[i]} → ${path[i + 1]} should be allowed`);
    }
  });

  it("failure path: draft → checkout → failed_payment → draft (retry)", () => {
    assert.ok(canTransition("draft", "checkout_created"));
    assert.ok(canTransition("checkout_created", "failed_payment"));
    assert.ok(canTransition("failed_payment", "draft"));
  });

  it("failure path: paid → failed_fulfillment → paid (retry)", () => {
    assert.ok(canTransition("paid_pending_manual_fulfillment", "failed_fulfillment"));
    assert.ok(canTransition("failed_fulfillment", "paid_pending_manual_fulfillment"));
  });

  it("refund path: paid → refunded (terminal)", () => {
    assert.ok(canTransition("paid_pending_manual_fulfillment", "refunded"));
    assert.deepEqual(ALLOWED_TRANSITIONS.refunded, []);
  });

  it("return path: mailed → returned → refunded", () => {
    assert.ok(canTransition("mailed", "returned"));
    assert.ok(canTransition("returned", "refunded"));
  });

  it("manual fulfillment: paid → manual_in_progress → submitted", () => {
    assert.ok(canTransition("paid_pending_manual_fulfillment", "manual_fulfillment_in_progress"));
    assert.ok(canTransition("manual_fulfillment_in_progress", "submitted_to_provider"));
  });

  it("every status in the enum has an entry in ALLOWED_TRANSITIONS", () => {
    const allStatuses = [
      "draft", "paid", "submitted_to_provider", "provider_processing",
      "mailed", "in_transit", "delivered", "failed", "uploaded", "priced",
      "checkout_created", "paid_pending_manual_fulfillment",
      "manual_fulfillment_in_progress", "cancelled", "refunded",
      "failed_payment", "failed_fulfillment", "failed_provider_submission", "returned",
    ];
    for (const status of allStatuses) {
      assert.ok(
        Array.isArray(ALLOWED_TRANSITIONS[status]),
        `Status "${status}" should have an entry in ALLOWED_TRANSITIONS`,
      );
    }
  });
});
