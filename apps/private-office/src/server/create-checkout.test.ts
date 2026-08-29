import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeCheckoutAmount,
  createCheckoutSessionInternal,
} from "@/services/checkout-service";
import { workflowProfiles } from "@/domain/workflow-profiles";
import type { WorkflowId } from "@/domain/workflows";

// ── Server-authoritative pricing ─────────────────────────────────────────

describe("computeCheckoutAmount: server-authoritative pricing", () => {
  it("computes preparation fee + certified mail for contractor-dispute", () => {
    const { amount, currency } = computeCheckoutAmount(
      "contractor-dispute",
      "certified",
    );
    const profile = workflowProfiles["contractor-dispute"];
    const expected = Math.round(
      (profile.pricing.preparationFee + profile.pricing.certifiedMail) * 100,
    );
    expect(amount).toBe(expected);
    expect(currency).toBe("usd");
  });

  it("computes preparation fee + standard mail for property-insurance-claim", () => {
    const { amount } = computeCheckoutAmount(
      "property-insurance-claim",
      "standard",
    );
    const profile = workflowProfiles["property-insurance-claim"];
    const expected = Math.round(
      (profile.pricing.preparationFee + profile.pricing.standardMail) * 100,
    );
    expect(amount).toBe(expected);
  });

  it("computes preparation fee + registered mail for bank-wire-dispute", () => {
    const { amount } = computeCheckoutAmount(
      "bank-wire-dispute",
      "registered",
    );
    const profile = workflowProfiles["bank-wire-dispute"];
    const expected = Math.round(
      (profile.pricing.preparationFee + (profile.pricing.registeredMail ?? profile.pricing.certifiedMail)) * 100,
    );
    expect(amount).toBe(expected);
  });

  it("returns amounts in cents (not dollars)", () => {
    const { amount } = computeCheckoutAmount(
      "contractor-dispute",
      "certified",
    );
    // 24.99 + 12.99 = 37.98 → 3798 cents
    expect(amount).toBe(3798);
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

    mockPaymentEvidenceRepo.create.mockResolvedValue({
      id: "pe-1",
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
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
    expect(createCall.amount).toBe(3798); // $24.99 + $12.99 = $37.98 → 3798 cents
    expect(createCall.currency).toBe("usd");

    // Verify metadata binds to exact matter and owner
    expect(createCall.metadata).toEqual({
      matterId: "matter-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
    });

    // Verify PaymentEvidence was created
    expect(mockPaymentEvidenceRepo.create).toHaveBeenCalledWith({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
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

    // Verify the amount sent to Stripe is the profile-derived amount
    const createCall = mockStripeAdapter.createCheckoutSession.mock.calls[0][0];
    const profile = workflowProfiles["contractor-dispute"];
    const expected = Math.round(
      (profile.pricing.preparationFee + profile.pricing.standardMail) * 100,
    );
    expect(createCall.amount).toBe(expected);
  });
});
