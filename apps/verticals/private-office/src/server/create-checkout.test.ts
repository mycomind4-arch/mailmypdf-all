import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeCheckoutAmount,
  createCheckoutSessionInternal,
} from "@/services/checkout-service";
import { calculateQuote } from "@mailmypdf/pricing";
import { workflowProfiles } from "@/domain/workflow-profiles";
import type { WorkflowId } from "@/domain/workflows";

// ── Server-authoritative pricing ─────────────────────────────────────────
//
// computeCheckoutAmount delegates to the canonical @mailmypdf/pricing engine
// (see checkout-service.ts) rather than pricing off this app's own
// workflow-profiles.ts data, so expectations here are derived the same way
// the implementation computes them — via calculateQuote — not by
// hand-duplicating a second, divergent pricing model.

describe("computeCheckoutAmount: server-authoritative pricing", () => {
  it("computes preparation fee + certified mail for contractor-dispute", () => {
    const { amount, currency } = computeCheckoutAmount(
      "contractor-dispute",
      "certified",
    );
    const profile = workflowProfiles["contractor-dispute"];
    const expected = calculateQuote({
      workflowId: "contractor-dispute",
      verticalId: profile.verticalId,
      actualPages: 3,
      mailClass: "certified",
    }).totalCents;
    expect(amount).toBe(expected);
    expect(currency).toBe("usd");
  });

  it("computes preparation fee + standard mail for property-insurance-claim", () => {
    const { amount } = computeCheckoutAmount(
      "property-insurance-claim",
      "standard",
    );
    const profile = workflowProfiles["property-insurance-claim"];
    const expected = calculateQuote({
      workflowId: "property-insurance-claim",
      verticalId: profile.verticalId,
      actualPages: 3,
      mailClass: "standard",
    }).totalCents;
    expect(amount).toBe(expected);
  });

  it("computes preparation fee + registered mail for bank-wire-dispute", () => {
    const { amount } = computeCheckoutAmount(
      "bank-wire-dispute",
      "registered",
    );
    const profile = workflowProfiles["bank-wire-dispute"];
    const expected = calculateQuote({
      workflowId: "bank-wire-dispute",
      verticalId: profile.verticalId,
      actualPages: 3,
      mailClass: "registered",
    }).totalCents;
    expect(amount).toBe(expected);
  });

  it("returns amounts in cents (not dollars)", () => {
    const { amount } = computeCheckoutAmount(
      "contractor-dispute",
      "certified",
    );
    expect(Number.isInteger(amount)).toBe(true);
    expect(amount).toBeGreaterThan(100); // sanity: cents, not a bare dollar figure like 37.98
  });

  it("throws on unknown workflow", () => {
    expect(() =>
      computeCheckoutAmount("nonexistent" as WorkflowId, "certified"),
    ).toThrow(/Unknown workflow/);
  });
});

// ── Checkout creation: full flow with mocks ──────────────────────────────

describe("createCheckoutSessionInternal", () => {
  const mockStripeAdapter = {
    provider: "stripe" as const,
    createCheckoutSession: vi.fn(),
    constructWebhookEvent: vi.fn(),
    retrievePaymentIntent: vi.fn(),
  };

  const mockPaymentEvidenceRepo = {
    create: vi.fn(),
    findBySessionId: vi.fn(),
    findByMatter: vi.fn(),
    markVerified: vi.fn(),
    markFailed: vi.fn(),
  };

  const mockMatterRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates checkout with correct amount and metadata binding", async () => {
    mockMatterRepo.get.mockResolvedValue({
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      title: "Test Matter",
      status: "approved",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: null,
      approvedDraftHash: null,
      draftHash: null,
      submittedAt: null,
      providerOrderId: null,
      trackingNumber: null,
      proofHash: null,
    });

    mockStripeAdapter.createCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_123",
      sessionUrl: "https://checkout.stripe.com/c/cs_test_123",
      paymentIntentId: "pi_test_123",
    });

    const contractorDisputeProfile = workflowProfiles["contractor-dispute"];
    const expectedAmount = calculateQuote({
      workflowId: "contractor-dispute",
      verticalId: contractorDisputeProfile.verticalId,
      actualPages: 3,
      mailClass: "certified",
    }).totalCents;

    mockPaymentEvidenceRepo.create.mockResolvedValue({
      id: "pe-1",
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: expectedAmount,
      currency: "usd",
      status: "pending",
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await createCheckoutSessionInternal(
      "user-1",
      {
        workflowId: "contractor-dispute",
        matterId: "matter-1",
        mailingMethod: "certified",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      {
        stripeAdapter: mockStripeAdapter as never,
        paymentEvidenceRepository: mockPaymentEvidenceRepo as never,
        matterRepository: mockMatterRepo as never,
      },
    );

    expect(result.checkoutUrl).toBe("https://checkout.stripe.com/c/cs_test_123");
    expect(result.sessionId).toBe("cs_test_123");

    // Verify server-authoritative pricing was used
    const createCall = mockStripeAdapter.createCheckoutSession.mock.calls[0][0];
    expect(createCall.amount).toBe(expectedAmount);
    expect(createCall.currency).toBe("usd");

    // Verify metadata binds to exact matter and owner, and carries an
    // immutable snapshot of the exact quote charged (SECURITY_CORE_REBUILD.md:
    // "A user approves the exact immutable packet hash/quote fulfillment receives").
    expect(createCall.metadata).toEqual({
      matterId: "matter-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
      pricingSource: "canonical",
      quoteTotalCents: String(expectedAmount),
      quoteSnapshot: expect.any(String),
    });

    // Verify PaymentEvidence was created
    expect(mockPaymentEvidenceRepo.create).toHaveBeenCalledWith({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: expectedAmount,
      currency: "usd",
    });
  });

  it("rejects when matter does not exist for owner", async () => {
    mockMatterRepo.get.mockResolvedValue(null);

    await expect(
      createCheckoutSessionInternal(
        "user-1",
        {
          workflowId: "contractor-dispute",
          matterId: "nonexistent-matter",
          mailingMethod: "certified",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        },
        {
          stripeAdapter: mockStripeAdapter as never,
          paymentEvidenceRepository: mockPaymentEvidenceRepo as never,
          matterRepository: mockMatterRepo as never,
        },
      ),
    ).rejects.toThrow(/Matter not found/);

    // Verify no checkout session was created
    expect(mockStripeAdapter.createCheckoutSession).not.toHaveBeenCalled();
    // Verify no payment evidence was created
    expect(mockPaymentEvidenceRepo.create).not.toHaveBeenCalled();
  });

  it("rejects when matter belongs to a different workflow", async () => {
    mockMatterRepo.get.mockResolvedValue({
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      title: "Test Matter",
      status: "approved",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: null,
      approvedDraftHash: null,
      draftHash: null,
      submittedAt: null,
      providerOrderId: null,
      trackingNumber: null,
      proofHash: null,
    });

    await expect(
      createCheckoutSessionInternal(
        "user-1",
        {
          workflowId: "contractor-dispute",
          matterId: "matter-1",
          mailingMethod: "certified",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        },
        {
          stripeAdapter: mockStripeAdapter as never,
          paymentEvidenceRepository: mockPaymentEvidenceRepo as never,
          matterRepository: mockMatterRepo as never,
        },
      ),
    ).rejects.toThrow(/does not belong to the specified workflow/);

    expect(mockStripeAdapter.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("client cannot set the amount — pricing is server-authoritative", async () => {
    mockMatterRepo.get.mockResolvedValue({
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      title: "Test Matter",
      status: "approved",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedAt: null,
      approvedDraftHash: null,
      draftHash: null,
      submittedAt: null,
      providerOrderId: null,
      trackingNumber: null,
      proofHash: null,
    });

    mockStripeAdapter.createCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_123",
      sessionUrl: "https://checkout.stripe.com/c/cs_test_123",
      paymentIntentId: "pi_test_123",
    });

    mockPaymentEvidenceRepo.create.mockResolvedValue({} as never);

    // The input does NOT include an amount field — pricing is derived
    await createCheckoutSessionInternal(
      "user-1",
      {
        workflowId: "contractor-dispute",
        matterId: "matter-1",
        mailingMethod: "standard",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      {
        stripeAdapter: mockStripeAdapter as never,
        paymentEvidenceRepository: mockPaymentEvidenceRepo as never,
        matterRepository: mockMatterRepo as never,
      },
    );

    // Verify the amount sent to Stripe is the canonical-engine-derived amount
    const createCall = mockStripeAdapter.createCheckoutSession.mock.calls[0][0];
    const profile = workflowProfiles["contractor-dispute"];
    const expected = calculateQuote({
      workflowId: "contractor-dispute",
      verticalId: profile.verticalId,
      actualPages: 3,
      mailClass: "standard",
    }).totalCents;
    expect(createCall.amount).toBe(expected);
  });
});
