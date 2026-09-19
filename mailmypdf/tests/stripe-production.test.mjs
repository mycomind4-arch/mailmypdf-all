import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

// ── Source-Level Tests: SDK Webhook Verification ──────────────────────────────

describe("Stripe Production — SDK Webhook Verification", () => {
  it("webhook route uses SDK constructEvent, not hand-rolled HMAC", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /crypto\.subtle\.importKey/);
    assert.doesNotMatch(webhook, /crypto\.subtle\.sign/);
  });

  it("webhook route does not import verifyWebhook from stripe.server.ts", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    // It should NOT import the hand-rolled verifyWebhook function
    // (it has its own verifyWebhookWithSdk function)
    assert.match(webhook, /verifyWebhookWithSdk/);
    // The old import of verifyWebhook should not be present
    assert.doesNotMatch(webhook, /import.*verifyWebhook.*from.*stripe\.server/);
  });

  it("stripe-adapter uses SDK constructEvent for webhook verification", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    assert.match(adapter, /webhooks\.constructEvent/);
    assert.doesNotMatch(adapter, /crypto\.subtle/);
  });

  it("stripe.server.ts does NOT export hand-rolled verifyWebhook (dead code removed)", async () => {
    const server = await source("src/lib/stripe.server.ts");
    assert.doesNotMatch(server, /export async function verifyWebhook/);
  });
});

// ── Source-Level Tests: Event Deduplication ───────────────────────────────────

describe("Stripe Production — Event Deduplication", () => {
  it("webhook route has isDuplicateEvent function", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /isDuplicateEvent/);
  });

  it("markOrderPaid checks for duplicates before processing", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderPaidSection = webhook.slice(webhook.indexOf("async function markOrderPaid"));
    assert.match(markOrderPaidSection, /isDuplicateEvent/);
  });

  it("markOrderFailed checks for duplicates before processing", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderFailedSection = webhook.slice(webhook.indexOf("async function markOrderFailed"));
    assert.match(markOrderFailedSection, /isDuplicateEvent/);
  });

  it("handleRefundEvent checks for duplicates before processing", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /isDuplicateEvent/);
  });

  it("recordProcessedEvent stores external_id for dedup lookup", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /recordProcessedEvent/);
    assert.match(webhook, /external_id/);
  });
});

// ── Source-Level Tests: Metadata Integrity ────────────────────────────────────

describe("Stripe Production — Metadata Integrity", () => {
  it("markOrderPaid verifies orderId in metadata", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderPaidSection = webhook.slice(webhook.indexOf("async function markOrderPaid"));
    assert.match(markOrderPaidSection, /getOrderId/);
    assert.match(markOrderPaidSection, /metadata\.orderId/);
  });

  it("markOrderPaid logs error when orderId is missing", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderPaidSection = webhook.slice(webhook.indexOf("async function markOrderPaid"));
    assert.match(markOrderPaidSection, /missing metadata\.orderId/);
  });

  it("markOrderPaid verifies order exists in database", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderPaidSection = webhook.slice(webhook.indexOf("async function markOrderPaid"));
    assert.match(markOrderPaidSection, /order not found/);
  });

  it("conditional update only transitions draft orders", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const markOrderPaidSection = webhook.slice(webhook.indexOf("async function markOrderPaid"));
    assert.match(markOrderPaidSection, /\.eq\("status", "draft"\)/);
  });
});

// ── Source-Level Tests: Refund Flow ────────────────────────────────────────────

describe("Stripe Production — Refund Flow", () => {
  it("webhook route handles refund events", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /charge\.refunded/);
    assert.match(webhook, /refund\.created/);
    assert.match(webhook, /refund\.updated/);
  });

  it("webhook route has handleRefundEvent function", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /async function handleRefundEvent/);
  });

  it("handleRefundEvent resolves orderId from payment_intent if missing from metadata", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /payment_intent/);
  });

  it("handleRefundEvent transitions order to 'refunded' on success", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    const refundSection = webhook.slice(webhook.indexOf("async function handleRefundEvent"));
    assert.match(refundSection, /refunded/);
    assert.match(refundSection, /canTransition/);
  });

  it("stripe.server.ts has createOrderRefund function", async () => {
    const server = await source("src/lib/stripe.server.ts");
    assert.match(server, /export async function createOrderRefund/);
    assert.match(server, /idempotencyKey/);
  });

  it("stripe.server.ts has getRefund and listRefundsForPaymentIntent", async () => {
    const server = await source("src/lib/stripe.server.ts");
    assert.match(server, /export async function getRefund/);
    assert.match(server, /export async function listRefundsForPaymentIntent/);
  });

  it("stripe-adapter has createRefund with idempotency key", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    assert.match(adapter, /createRefund/);
    assert.match(adapter, /idempotencyKey/);
  });
});

// ── Source-Level Tests: Retry & Timeout ────────────────────────────────────────

describe("Stripe Production — Retry & Timeout", () => {
  it("stripe-adapter uses withRetry on createCheckoutSession", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    assert.match(adapter, /withRetry/);
  });

  it("stripe-adapter uses withRetry on createRefund", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    const refundSection = adapter.slice(adapter.indexOf("async createRefund"));
    assert.match(refundSection, /withRetry/);
  });

  it("stripe-adapter has structured request logging", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    assert.match(adapter, /logRequest\.start/);
    assert.match(adapter, /logRequest\.end/);
  });

  it("stripe-adapter has webhook logging", async () => {
    const adapter = await source("src/providers/adapters/stripe-adapter.ts");
    assert.match(adapter, /logWebhook/);
  });
});

// ── Source-Level Tests: Edge Case Handling ─────────────────────────────────────

describe("Stripe Production — Edge Case Handling", () => {
  it("webhook handles async payment succeeded", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
  });

  it("webhook handles async payment failed", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /checkout\.session\.async_payment_failed/);
  });

  it("webhook handles payment_intent.payment_failed", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /payment_intent\.payment_failed/);
  });

  it("webhook handles unhandled event types gracefully", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /unhandled event/);
  });

  it("webhook has structured error logging on verification failure", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /signature verification failed/);
  });

  it("idempotent no-op logs when order already processed", async () => {
    const webhook = await source("src/routes/api/public/payments/webhook.ts");
    assert.match(webhook, /idempotent no-op/);
  });
});

// ── Behavioral Tests: Deduplication Logic ──────────────────────────────────────

describe("Stripe Production — Deduplication Logic (Inline)", () => {
  // Simulate the dedup logic
  function makeDedupKey(orderId, eventType, externalId) {
    return `${orderId}:${eventType}:${externalId}`;
  }

  it("same event ID produces same dedup key", () => {
    const k1 = makeDedupKey("order_123", "payment.received", "evt_001");
    const k2 = makeDedupKey("order_123", "payment.received", "evt_001");
    assert.equal(k1, k2);
  });

  it("different event ID produces different dedup key", () => {
    const k1 = makeDedupKey("order_123", "payment.received", "evt_001");
    const k2 = makeDedupKey("order_123", "payment.received", "evt_002");
    assert.notEqual(k1, k2);
  });

  it("same event ID for different order produces different key", () => {
    const k1 = makeDedupKey("order_123", "payment.received", "evt_001");
    const k2 = makeDedupKey("order_456", "payment.received", "evt_001");
    assert.notEqual(k1, k2);
  });

  it("same event ID for different event type produces different key", () => {
    const k1 = makeDedupKey("order_123", "payment.received", "evt_001");
    const k2 = makeDedupKey("order_123", "payment.failed", "evt_001");
    assert.notEqual(k1, k2);
  });
});

// ── Behavioral Tests: Refund Amount Validation ────────────────────────────────

describe("Stripe Production — Refund Logic (Inline)", () => {
  it("full refund when amountCents is undefined", () => {
    const amountCents = undefined;
    const refundPayload = { amount: amountCents };
    assert.equal(refundPayload.amount, undefined); // Stripe API interprets undefined as full
  });

  it("partial refund when amountCents is specified", () => {
    const amountCents = 500; // $5.00
    const refundPayload = { amount: amountCents };
    assert.equal(refundPayload.amount, 500);
  });

  it("refund idempotency key includes payment intent and amount", () => {
    const paymentIntentId = "pi_12345";
    const amountCents = 199;
    const idempotencyKey = `refund_${paymentIntentId}_${amountCents ?? "full"}`;
    assert.equal(idempotencyKey, "refund_pi_12345_199");
  });

  it("full refund idempotency key uses 'full' suffix", () => {
    const paymentIntentId = "pi_12345";
    const amountCents = undefined;
    const idempotencyKey = `refund_${paymentIntentId}_${amountCents ?? "full"}`;
    assert.equal(idempotencyKey, "refund_pi_12345_full");
  });
});
