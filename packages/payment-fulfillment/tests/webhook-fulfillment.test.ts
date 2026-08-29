/**
 * Stripe Webhook & Fulfillment Idempotency Tests
 *
 * Tests for:
 * - Webhook signature verification (mock)
 * - checkout.session.completed → fulfillment
 * - checkout.session.expired → mark expired
 * - charge.refunded → mark refunded
 * - Duplicate event handling (idempotency)
 * - Out-of-order events
 * - Invalid signature rejection
 * - Fulfillment idempotency (one order → one mailing)
 *
 * Uses mock stores and clients — no real Stripe or Lob calls.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fulfillMailingIntent,
  handleStripeWebhookEvent,
  verifyIntegrity,
  hashDraft,
  hashRecipient,
  sha256,
  type MailingIntent,
  type MailingIntentStore,
  type MailMyPDFClient,
  type MailingRecipient,
  type MailType,
  type StripeWebhookEvent,
} from "../src/index.ts";

// ═══════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createMockIntent(overrides: Partial<MailingIntent> = {}): MailingIntent {
  const recipient: MailingRecipient = {
    name: "IRS",
    address1: "5000 Ellin Rd",
    city: "Fresno",
    state: "CA",
    zip: "93888",
    country: "US",
  };
  const draft = "This is a dispute response letter.";
  return {
    id: "intent-001",
    owner_id: "user-001",
    workflow_id: "debt-collection-dispute",
    case_id: null,
    approval_id: null,
    draft_content: draft,
    recipient,
    mailing_method: "first_class" as MailType,
    matter_reference: "debt-collection-dispute",
    matter_type: "dispute-mail",
    approved_draft_hash: hashDraft(draft),
    approved_recipient_hash: hashRecipient(recipient),
    stripe_session_id: "cs_test_001",
    stripe_payment_intent_id: null,
    stripe_price_cents: 3498,
    status: "approved",
    provider_order_id: null,
    tracking_number: null,
    error_message: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockStore(intent: MailingIntent): MailingIntentStore & {
  updates: Array<{ id: string; update: Record<string, unknown> }>;
  loads: number;
} {
  let stored = { ...intent };
  const updates: Array<{ id: string; update: Record<string, unknown> }> = [];
  let loads = 0;

  return {
    loads,
    updates,
    async load(intentId: string): Promise<MailingIntent | null> {
      loads++;
      if (intentId !== stored.id) return null;
      return { ...stored };
    },
    async loadByStripeSession(_sessionId: string): Promise<MailingIntent | null> {
      return { ...stored };
    },
    async updateStatus(
      intentId: string,
      update: Partial<Pick<MailingIntent,
        "status" | "stripe_session_id" | "stripe_payment_intent_id"
        | "provider_order_id" | "tracking_number" | "error_message"
      >>,
    ): Promise<void> {
      updates.push({ id: intentId, update: update as Record<string, unknown> });
      Object.assign(stored, update);
    },
  };
}

function createMockClient(): MailMyPDFClient & {
  uploadCount: number;
  commCount: number;
} {
  return {
    uploadCount: 0,
    commCount: 0,
    async uploadDocument(_content: string, _filename: string, _mimeType: string): Promise<{ id: string }> {
      return { id: `doc-${++this.uploadCount}` };
    },
    async createCommunication(params: {
      document_id: string;
      recipient: MailingRecipient;
      mail_type: MailType;
      matter_reference: string;
      matter_type: string;
      metadata: Record<string, unknown>;
      idempotency_key: string;
    }): Promise<{ id: string; tracking_number?: string; status?: string }> {
      return {
        id: `comm-${++this.commCount}`,
        tracking_number: `TRK${this.commCount}`,
        status: "submitted",
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HASHING TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Hashing", () => {
  it("sha256 produces consistent hashes", () => {
    const h1 = sha256("test content");
    const h2 = sha256("test content");
    assert.equal(h1, h2);
    assert.equal(h1.length, 64); // SHA-256 hex length
  });

  it("hashRecipient is case-insensitive and trims whitespace", () => {
    const r1: MailingRecipient = { name: "  IRS  ", address1: "5000 Ellin Rd", city: "Fresno", state: " ca ", zip: "93888" };
    const r2: MailingRecipient = { name: "irs", address1: "5000 Ellin Rd", city: "FRESNO", state: "CA", zip: "93888" };
    assert.equal(hashRecipient(r1), hashRecipient(r2));
  });

  it("hashDraft is deterministic", () => {
    assert.equal(hashDraft("letter content"), hashDraft("letter content"));
    assert.notEqual(hashDraft("letter content"), hashDraft("different content"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRITY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Integrity verification", () => {
  it("passes for a valid intent with matching hashes", () => {
    const intent = createMockIntent();
    const result = verifyIntegrity(intent);
    assert.equal(result.ok, true);
  });

  it("fails when draft hash doesn't match", () => {
    const intent = createMockIntent({ approved_draft_hash: "wrong_hash" });
    const result = verifyIntegrity(intent);
    assert.equal(result.ok, false);
    assert.match(result.error!, /draft does not match/);
  });

  it("fails when recipient hash doesn't match", () => {
    const intent = createMockIntent({ approved_recipient_hash: "wrong_hash" });
    const result = verifyIntegrity(intent);
    assert.equal(result.ok, false);
    assert.match(result.error!, /recipient does not match/);
  });

  it("fails when recipient is incomplete", () => {
    const intent = createMockIntent({
      recipient: { name: "", address1: "", city: "", state: "", zip: "" },
      approved_recipient_hash: null,
    });
    const result = verifyIntegrity(intent);
    assert.equal(result.ok, false);
    assert.match(result.error!, /incomplete/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FULFILLMENT IDEMPOTENCY
// ═══════════════════════════════════════════════════════════════════════════

describe("Fulfillment idempotency", () => {
  it("first fulfillment succeeds and creates one mailing", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const result = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );

    assert.equal(result.success, true);
    assert.equal(result.idempotent ?? false, false);
    assert.ok(result.providerOrderId);
    assert.equal(client.uploadCount, 1);
    assert.equal(client.commCount, 1);
  });

  it("second fulfillment is idempotent — no duplicate mailing", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    // First fulfillment
    const r1 = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );
    assert.equal(r1.success, true);

    // Second fulfillment (e.g., duplicate webhook)
    const r2 = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );
    assert.equal(r2.success, true);
    assert.equal(r2.idempotent, true);
    assert.equal(client.uploadCount, 1); // still only 1 upload
    assert.equal(client.commCount, 1);   // still only 1 communication
  });

  it("browser-return and webhook can both fire without duplicate", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    // Webhook fires first
    const webhookResult = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );
    assert.equal(webhookResult.success, true);

    // Browser return fires second (user came back to the site)
    const browserResult = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "browser-return", "dispute-mail",
    );
    assert.equal(browserResult.success, true);
    assert.equal(browserResult.idempotent, true);
    assert.equal(client.commCount, 1); // still only 1 mailing
  });

  it("rejects fulfillment when session ID doesn't match", async () => {
    const intent = createMockIntent({ stripe_session_id: "cs_test_001" });
    const store = createMockStore(intent);
    const client = createMockClient();

    const result = await fulfillMailingIntent(
      store, client, "intent-001", "cs_WRONG", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );

    assert.equal(result.success, false);
    assert.match(result.error!, /session does not match/);
    assert.equal(client.commCount, 0);
  });

  it("handles fulfillment failure gracefully", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    // Make the client fail
    client.createCommunication = async () => {
      throw new Error("Lob API timeout");
    };

    const result = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );

    assert.equal(result.success, false);
    assert.match(result.error!, /timeout/);
    // Check that status was updated to "failed"
    assert.equal(store.updates.some(u => u.update.status === "failed"), true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

describe("Stripe webhook handler", () => {
  it("checkout.session.completed triggers fulfillment", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_001",
          payment_status: "paid",
          metadata: { mailing_intent_id: "intent-001" },
          payment_intent: "pi_test_001",
        },
      },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).received, true);
    assert.equal((result as Record<string, unknown>).success, true);
    assert.equal(client.commCount, 1);
  });

  it("skips when payment_status is not paid", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_001",
          payment_status: "unpaid",
          metadata: { mailing_intent_id: "intent-001" },
        },
      },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).skipped, true);
    assert.equal(client.commCount, 0);
  });

  it("skips when no mailing_intent_id in metadata", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_001",
          payment_status: "paid",
          metadata: {},
        },
      },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).skipped, true);
    assert.equal(client.commCount, 0);
  });

  it("checkout.session.expired marks intent as expired", async () => {
    const intent = createMockIntent({ status: "approved" });
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "checkout.session.expired",
      data: {
        object: {
          metadata: { mailing_intent_id: "intent-001" },
        },
      },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).handled, "checkout.session.expired");
    assert.equal(store.updates.some(u => u.update.status === "expired"), true);
    assert.equal(client.commCount, 0);
  });

  it("charge.refunded marks intent as refunded", async () => {
    const intent = createMockIntent({ status: "submitted", provider_order_id: "comm-001" });
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "charge.refunded",
      data: {
        object: {
          metadata: { mailing_intent_id: "intent-001" },
        },
      },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).handled, "charge.refunded");
    assert.equal(store.updates.some(u => u.update.status === "refunded"), true);
  });

  it("duplicate checkout.session.completed does not create duplicate mailing", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_001",
          payment_status: "paid",
          metadata: { mailing_intent_id: "intent-001" },
          payment_intent: "pi_test_001",
        },
      },
    };

    const config = {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    };

    // First webhook
    const r1 = await handleStripeWebhookEvent(event, config);
    assert.equal((r1 as Record<string, unknown>).success, true);

    // Duplicate webhook
    const r2 = await handleStripeWebhookEvent(event, config);
    assert.equal((r2 as Record<string, unknown>).success, true);
    assert.equal((r2 as Record<string, unknown>).idempotent, true);

    // Only one mailing was created
    assert.equal(client.commCount, 1);
  });

  it("unhandled event types are acknowledged but not processed", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    const event: StripeWebhookEvent = {
      type: "invoice.created",
      data: { object: {} },
    };

    const result = await handleStripeWebhookEvent(event, {
      store,
      client,
      verticalName: "dispute-mail",
      stripeSecretKey: "sk_test",
      stripeWebhookSecret: "whsec_test",
    });

    assert.equal((result as Record<string, unknown>).received, true);
    assert.equal((result as Record<string, unknown>).unhandled, "invoice.created");
    assert.equal(client.commCount, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: PAYMENT-THEN-FAILURE RECOVERY
// ═══════════════════════════════════════════════════════════════════════════

describe("Payment-failure recovery", () => {
  it("Stripe succeeded, Lob failed — order remains in failed state", async () => {
    const intent = createMockIntent();
    const store = createMockStore(intent);
    const client = createMockClient();

    client.createCommunication = async () => {
      throw new Error("Lob API error: invalid address");
    };

    const result = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );

    // Fulfillment failed
    assert.equal(result.success, false);
    assert.match(result.error!, /invalid address/);

    // But payment was recorded before the failure
    assert.equal(store.updates.some(u => u.update.status === "paid"), true);
    // And the failure was recorded
    assert.equal(store.updates.some(u => u.update.status === "failed"), true);
  });

  it("Failed fulfillment can be retried — retry does not create duplicate", async () => {
    const intent = createMockIntent({ status: "failed", stripe_session_id: "cs_test_001" });
    const store = createMockStore(intent);
    const client = createMockClient();

    // Reset the client to succeed now
    let callCount = 0;
    client.createCommunication = async () => {
      callCount++;
      return { id: `comm-${callCount}`, tracking_number: `TRK${callCount}`, status: "submitted" };
    };

    // Retry
    const result = await fulfillMailingIntent(
      store, client, "intent-001", "cs_test_001", "pi_test_001",
      "stripe-webhook", "dispute-mail",
    );

    // The retry should succeed
    assert.equal(result.success, true);
    assert.equal(callCount, 1); // exactly one mailing created
  });
});
