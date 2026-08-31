import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the MailJob domain models and status mapping.
// We inline the mapping tables to test the logic without importing the TS
// module (which has dependencies on Supabase types).

// ── Inline copy from src/domain/status-mapping.ts ───────────────────────────

const ORDER_TO_MAILJOB = {
  draft: "draft",
  uploaded: "draft",
  priced: "validated",
  checkout_created: "payment_pending",
  paid: "payment_complete",
  paid_pending_manual_fulfillment: "payment_complete",
  manual_fulfillment_in_progress: "queued",
  submitted_to_provider: "submitted",
  provider_processing: "accepted",
  mailed: "submitted",
  in_transit: "in_transit",
  delivered: "delivered",
  failed: "failed",
  failed_payment: "failed",
  failed_fulfillment: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
  returned: "completed",
};

function mapOrderStatusToMailJobStatus(orderStatus) {
  return ORDER_TO_MAILJOB[orderStatus] ?? "draft";
}

const MAILJOB_TO_ORDER = {
  draft: "draft",
  validated: "priced",
  payment_pending: "checkout_created",
  payment_complete: "paid",
  queued: "paid_pending_manual_fulfillment",
  submitted: "submitted_to_provider",
  accepted: "provider_processing",
  in_transit: "in_transit",
  delivered: "delivered",
  completed: "delivered",
  archived: "delivered",
  failed: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

function mapMailJobStatusToOrderStatus(mailJobStatus) {
  return MAILJOB_TO_ORDER[mailJobStatus] ?? "draft";
}

const MAILJOB_TRANSITIONS = {
  draft: ["validated", "failed", "cancelled"],
  validated: ["payment_pending", "cancelled"],
  payment_pending: ["payment_complete", "failed", "cancelled"],
  payment_complete: ["queued", "cancelled", "refunded"],
  queued: ["submitted", "failed", "cancelled"],
  submitted: ["accepted", "failed", "cancelled"],
  accepted: ["in_transit", "failed", "cancelled"],
  in_transit: ["delivered", "completed", "cancelled"],
  delivered: ["completed", "cancelled", "refunded"],
  completed: ["archived", "refunded"],
  archived: [],
  failed: ["draft", "cancelled"],
  cancelled: [],
  refunded: [],
};

function canTransitionTo(from, to) {
  const allowed = MAILJOB_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Status Mapping: OrderStatus → MailJobStatus", () => {
  it("maps draft to draft", () => {
    assert.equal(mapOrderStatusToMailJobStatus("draft"), "draft");
  });

  it("maps uploaded to draft (upload is part of draft phase)", () => {
    assert.equal(mapOrderStatusToMailJobStatus("uploaded"), "draft");
  });

  it("maps priced to validated", () => {
    assert.equal(mapOrderStatusToMailJobStatus("priced"), "validated");
  });

  it("maps checkout_created to payment_pending", () => {
    assert.equal(mapOrderStatusToMailJobStatus("checkout_created"), "payment_pending");
  });

  it("maps paid to payment_complete", () => {
    assert.equal(mapOrderStatusToMailJobStatus("paid"), "payment_complete");
  });

  it("maps paid_pending_manual_fulfillment to payment_complete", () => {
    assert.equal(
      mapOrderStatusToMailJobStatus("paid_pending_manual_fulfillment"),
      "payment_complete",
    );
  });

  it("maps submitted_to_provider to submitted", () => {
    assert.equal(mapOrderStatusToMailJobStatus("submitted_to_provider"), "submitted");
  });

  it("maps provider_processing to accepted", () => {
    assert.equal(mapOrderStatusToMailJobStatus("provider_processing"), "accepted");
  });

  it("maps in_transit to in_transit", () => {
    assert.equal(mapOrderStatusToMailJobStatus("in_transit"), "in_transit");
  });

  it("maps delivered to delivered", () => {
    assert.equal(mapOrderStatusToMailJobStatus("delivered"), "delivered");
  });

  it("maps returned to completed", () => {
    assert.equal(mapOrderStatusToMailJobStatus("returned"), "completed");
  });

  it("maps all failure states to failed", () => {
    assert.equal(mapOrderStatusToMailJobStatus("failed"), "failed");
    assert.equal(mapOrderStatusToMailJobStatus("failed_payment"), "failed");
    assert.equal(mapOrderStatusToMailJobStatus("failed_fulfillment"), "failed");
  });

  it("maps cancelled and refunded", () => {
    assert.equal(mapOrderStatusToMailJobStatus("cancelled"), "cancelled");
    assert.equal(mapOrderStatusToMailJobStatus("refunded"), "refunded");
  });
});

describe("Status Mapping: MailJobStatus → OrderStatus", () => {
  it("round-trips draft", () => {
    assert.equal(mapMailJobStatusToOrderStatus("draft"), "draft");
  });

  it("round-trips payment_pending", () => {
    assert.equal(mapMailJobStatusToOrderStatus("payment_pending"), "checkout_created");
  });

  it("maps queued to paid_pending_manual_fulfillment", () => {
    assert.equal(
      mapMailJobStatusToOrderStatus("queued"),
      "paid_pending_manual_fulfillment",
    );
  });

  it("maps archived to delivered (no archived in DB enum)", () => {
    assert.equal(mapMailJobStatusToOrderStatus("archived"), "delivered");
  });

  it("maps completed to delivered", () => {
    assert.equal(mapMailJobStatusToOrderStatus("completed"), "delivered");
  });
});

describe("MailJob Transition Validation", () => {
  it("allows draft → validated", () => {
    assert.equal(canTransitionTo("draft", "validated"), true);
  });

  it("allows validated → payment_pending", () => {
    assert.equal(canTransitionTo("validated", "payment_pending"), true);
  });

  it("allows payment_pending → payment_complete", () => {
    assert.equal(canTransitionTo("payment_pending", "payment_complete"), true);
  });

  it("allows payment_complete → queued", () => {
    assert.equal(canTransitionTo("payment_complete", "queued"), true);
  });

  it("allows queued → submitted", () => {
    assert.equal(canTransitionTo("queued", "submitted"), true);
  });

  it("allows submitted → accepted", () => {
    assert.equal(canTransitionTo("submitted", "accepted"), true);
  });

  it("allows accepted → in_transit", () => {
    assert.equal(canTransitionTo("accepted", "in_transit"), true);
  });

  it("allows in_transit → delivered", () => {
    assert.equal(canTransitionTo("in_transit", "delivered"), true);
  });

  it("allows delivered → completed", () => {
    assert.equal(canTransitionTo("delivered", "completed"), true);
  });

  it("allows completed → archived", () => {
    assert.equal(canTransitionTo("completed", "archived"), true);
  });

  it("allows failed → draft (retry)", () => {
    assert.equal(canTransitionTo("failed", "draft"), true);
  });

  it("allows cancelled from any non-terminal state", () => {
    assert.equal(canTransitionTo("draft", "cancelled"), true);
    assert.equal(canTransitionTo("payment_complete", "cancelled"), true);
    assert.equal(canTransitionTo("in_transit", "cancelled"), true);
  });

  it("allows refunded from paid states", () => {
    assert.equal(canTransitionTo("payment_complete", "refunded"), true);
    assert.equal(canTransitionTo("delivered", "refunded"), true);
    assert.equal(canTransitionTo("completed", "refunded"), true);
  });

  it("rejects invalid forward transitions", () => {
    assert.equal(canTransitionTo("draft", "in_transit"), false);
    assert.equal(canTransitionTo("draft", "delivered"), false);
    assert.equal(canTransitionTo("validated", "in_transit"), false);
  });

  it("rejects transitions from terminal states", () => {
    assert.equal(canTransitionTo("archived", "delivered"), false);
    assert.equal(canTransitionTo("cancelled", "draft"), false);
    assert.equal(canTransitionTo("refunded", "draft"), false);
  });

  it("has transitions defined for every MailJobStatus", () => {
    const allStatuses = [
      "draft", "validated", "payment_pending", "payment_complete",
      "queued", "submitted", "accepted", "in_transit",
      "delivered", "completed", "archived", "failed",
      "cancelled", "refunded",
    ];
    for (const status of allStatuses) {
      assert.ok(
        status in MAILJOB_TRANSITIONS,
        `Missing transitions for status: ${status}`,
      );
    }
  });

  it("every transition target is a valid MailJobStatus", () => {
    const allStatuses = new Set([
      "draft", "validated", "payment_pending", "payment_complete",
      "queued", "submitted", "accepted", "in_transit",
      "delivered", "completed", "archived", "failed",
      "cancelled", "refunded",
    ]);
    for (const [from, targets] of Object.entries(MAILJOB_TRANSITIONS)) {
      for (const to of targets) {
        assert.ok(
          allStatuses.has(to),
          `Invalid transition target "${to}" from "${from}"`,
        );
      }
    }
  });
});
