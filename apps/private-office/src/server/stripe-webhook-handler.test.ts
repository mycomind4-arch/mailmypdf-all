import { describe, expect, it, vi } from "vitest";
import { handleStripeWebhook } from "./stripe-webhook-handler";

// ── Mock dependencies ─────────────────────────────────────────────────────

function createMockPaymentEvidenceRepo() {
  return {
    create: vi.fn(),
    findBySessionId: vi.fn(),
    findByMatter: vi.fn(),
    markVerified: vi.fn(),
    markFailed: vi.fn(),
  };
}

function createMockStripeAdapter(constructEventImpl?: (rawBody: string, sig: string, secret: string) => unknown) {
  return {
    provider: "stripe" as const,
    constructWebhookEvent: vi.fn(constructEventImpl ?? (() => {
      throw new Error("No signatures found matching the expected signature for payload");
    })),
    createCheckoutSession: vi.fn(),
    retrievePaymentIntent: vi.fn(),
  };
}

const config = {
  webhookSecret: "whsec_test_secret",
};

// ── Webhook handler: signature verification ──────────────────────────────

describe("Stripe webhook handler: signature verification", () => {
  it("rejects GET requests", async () => {
    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", { method: "GET" }),
      {
        stripeAdapter: createMockStripeAdapter() as never,
        paymentEvidenceRepository: createMockPaymentEvidenceRepo() as never,
        webhookSecret: config.webhookSecret,
      },
    );
    expect(response.status).toBe(405);
  });

  it("rejects POST without stripe-signature header", async () => {
    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        body: '{"id": "evt_1"}',
      }),
      {
        stripeAdapter: createMockStripeAdapter() as never,
        paymentEvidenceRepository: createMockPaymentEvidenceRepo() as never,
        webhookSecret: config.webhookSecret,
      },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Missing stripe-signature/);
  });

  it("rejects POST with invalid signature", async () => {
    const adapter = createMockStripeAdapter(() => {
      throw new Error("Invalid signature");
    });

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=invalid,sig=bad" },
        body: '{"id": "evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: createMockPaymentEvidenceRepo() as never,
        webhookSecret: config.webhookSecret,
      },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid webhook signature/);
  });
});

// ── Webhook handler: checkout.session.completed ─────────────────────────

describe("Stripe webhook handler: checkout.session.completed", () => {
  it("marks payment evidence as verified", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    mockRepo.markVerified.mockResolvedValue({
      id: "pe-1",
      status: "verified",
    });

    const event = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_intent: "pi_test_123" } },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("verified");
    expect(mockRepo.markVerified).toHaveBeenCalledWith("cs_test_123", "pi_test_123");
  });

  it("rejects session without payment_intent", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    const event = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_intent: null } },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(400);
    expect(mockRepo.markVerified).not.toHaveBeenCalled();
  });
});

// ── Webhook handler: payment_intent.payment_failed ───────────────────────

describe("Stripe webhook handler: payment_intent.payment_failed", () => {
  it("marks payment evidence as failed", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    mockRepo.markFailed.mockResolvedValue({
      id: "pe-1",
      status: "failed",
    });

    const event = {
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_test_123",
          metadata: { session_id: "cs_test_123" },
          last_payment_error: { message: "Card declined" },
        },
      },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("failed");
    expect(mockRepo.markFailed).toHaveBeenCalledWith("cs_test_123", "Card declined");
  });

  it("handles unlinked payment intent (no session_id in metadata)", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    const event = {
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_test_123",
          metadata: {},
          last_payment_error: { message: "Card declined" },
        },
      },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("unlinked");
    expect(mockRepo.markFailed).not.toHaveBeenCalled();
  });
});

// ── Webhook handler: idempotency ─────────────────────────────────────────

describe("Stripe webhook handler: idempotency", () => {
  it("duplicate checkout.session.completed is harmless (markVerified is idempotent)", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    // First call marks as verified, second call (duplicate) returns existing
    mockRepo.markVerified
      .mockResolvedValueOnce({ id: "pe-1", status: "verified" })
      .mockResolvedValueOnce({ id: "pe-1", status: "verified" });

    const event = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_intent: "pi_test_123" } },
    };

    const adapter = createMockStripeAdapter(() => event);

    const request = new Request("https://example.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=valid" },
      body: '{"id":"evt_1"}',
    });

    // First delivery
    const response1 = await handleStripeWebhook(request.clone(), {
      stripeAdapter: adapter as never,
      paymentEvidenceRepository: mockRepo as never,
      webhookSecret: config.webhookSecret,
    });
    expect(response1.status).toBe(200);

    // Duplicate delivery
    const response2 = await handleStripeWebhook(request.clone(), {
      stripeAdapter: adapter as never,
      paymentEvidenceRepository: mockRepo as never,
      webhookSecret: config.webhookSecret,
    });
    expect(response2.status).toBe(200);

    // Both calls should have succeeded without error
    expect(mockRepo.markVerified).toHaveBeenCalledTimes(2);
  });
});

// ── Webhook handler: unhandled events ────────────────────────────────────

describe("Stripe webhook handler: unhandled events", () => {
  it("acknowledges but does not process unhandled event types", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    const event = {
      type: "invoice.paid",
      data: { object: {} },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("unhandled");
  });
});

// ── Webhook handler: repository errors ───────────────────────────────────

describe("Stripe webhook handler: repository errors", () => {
  it("returns 500 when repository throws (Stripe will retry)", async () => {
    const mockRepo = createMockPaymentEvidenceRepo();
    mockRepo.markVerified.mockRejectedValue(new Error("Database connection failed"));

    const event = {
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_intent: "pi_test_123" } },
    };

    const adapter = createMockStripeAdapter(() => event);

    const response = await handleStripeWebhook(
      new Request("https://example.com/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=valid" },
        body: '{"id":"evt_1"}',
      }),
      {
        stripeAdapter: adapter as never,
        paymentEvidenceRepository: mockRepo as never,
        webhookSecret: config.webhookSecret,
      },
    );

    expect(response.status).toBe(500);
  });
});
