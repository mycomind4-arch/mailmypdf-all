import { describe, expect, it, vi } from "vitest";
import {
  verifyPaymentForFulfillment,
} from "./payment-verification";
import type {
  PaymentEvidence,
  PaymentEvidenceRepository,
} from "@/domain/payment-evidence";

// ── Mock repository factory ─────────────────────────────────────────────

function createMockRepo(
  findByMatterImpl?: (ownerId: string, matterId: string) => PaymentEvidence | null,
): PaymentEvidenceRepository {
  return {
    create: vi.fn(),
    findBySessionId: vi.fn(),
    findByMatter: vi.fn(
      findByMatterImpl ??
        (() => null),
    ),
    markVerified: vi.fn(),
    markFailed: vi.fn(),
  };
}

function verifiedEvidence(overrides: Partial<PaymentEvidence> = {}): PaymentEvidence {
  return {
    id: "pe-1",
    ownerId: "user-1",
    matterId: "matter-1",
    workflowId: "contractor-dispute",
    stripeSessionId: "cs_test_123",
    stripePaymentIntentId: "pi_test_123",
    amount: 3798,
    currency: "usd",
    status: "verified",
    verifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Payment verification: derived from evidence ───────────────────────────

describe("verifyPaymentForFulfillment: derives from PaymentEvidence", () => {
  it("returns paymentVerified=true with stripePaymentId when evidence is verified", async () => {
    const repo = createMockRepo(() => verifiedEvidence());
    const result = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(result.paymentVerified).toBe(true);
    expect(result.stripePaymentId).toBe("pi_test_123");
  });

  it("returns paymentVerified=false when no evidence exists", async () => {
    const repo = createMockRepo(() => null);
    const result = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(result.paymentVerified).toBe(false);
    expect(result.stripePaymentId).toBe("");
  });

  it("returns paymentVerified=false when evidence is pending", async () => {
    const repo = createMockRepo(() =>
      verifiedEvidence({ status: "pending", verifiedAt: null }),
    );
    const result = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(result.paymentVerified).toBe(false);
    expect(result.stripePaymentId).toBe("");
  });

  it("returns paymentVerified=false when evidence is failed", async () => {
    const repo = createMockRepo(() =>
      verifiedEvidence({ status: "failed" }),
    );
    const result = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(result.paymentVerified).toBe(false);
    expect(result.stripePaymentId).toBe("");
  });

  it("uses owner and matter for lookup (owner isolation)", async () => {
    const repo = createMockRepo();
    await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(repo.findByMatter).toHaveBeenCalledWith("user-1", "matter-1");
  });

  it("different owner gets no payment evidence", async () => {
    const repo = createMockRepo((_ownerId, _matterId) => null);
    const result = await verifyPaymentForFulfillment("user-2", "matter-1", repo);
    expect(result.paymentVerified).toBe(false);
  });
});

// ── Payment verification boundary: payment does not authorize ────────────

describe("Payment verification boundary: payment does NOT authorize mailing", () => {
  it("verified payment alone does not satisfy canAuthorizeMatterMail", async () => {
    // Import the existing authorization gate
    const { canAuthorizeMatterMail } = await import("@/domain/gold-standard");

    const repo = createMockRepo(() => verifiedEvidence());
    const paymentResult = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(paymentResult.paymentVerified).toBe(true);

    // Even with payment verified, other gates must all pass
    const analysisWithBlocking = {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [],
      findings: [
        { id: "f1", state: "missing", title: "Missing", detail: "Missing", severity: "high" },
      ],
      evidence: [],
      timeline: [],
      strategy: [],
      blockingIssues: ["Blocking issue"],
      risks: [],
      generationProvenance: null,
    } as never;

    // Payment verified but analysis has blocking issues → NOT authorized
    expect(
      canAuthorizeMatterMail({
        analysis: analysisWithBlocking,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: paymentResult.paymentVerified,
      }),
    ).toBe(false);
  });

  it("verified payment with draft modified after approval still blocks", async () => {
    const { canAuthorizeMatterMail } = await import("@/domain/gold-standard");
    const { isApprovalValid } = await import("@/domain/draft-provenance");

    const repo = createMockRepo(() => verifiedEvidence());
    const paymentResult = await verifyPaymentForFulfillment("user-1", "matter-1", repo);
    expect(paymentResult.paymentVerified).toBe(true);

    // Draft hash mismatch → not valid → blocks authorization
    const draftValid = isApprovalValid(
      "currentHashDifferent",
      "approvedHash123",
    );
    expect(draftValid).toBe(false);

    // Even with all other gates passing, stale draft blocks
    const cleanAnalysis = {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [],
      findings: [
        { id: "f1", state: "confirmed", title: "OK", detail: "OK", severity: "low" },
      ],
      evidence: [],
      timeline: [],
      strategy: [],
      blockingIssues: [],
      risks: [],
      generationProvenance: null,
    } as never;

    // If draft is not validated (stale), authorization fails even with payment
    expect(
      canAuthorizeMatterMail({
        analysis: cleanAnalysis,
        draftValidated: false, // stale draft
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: paymentResult.paymentVerified,
      }),
    ).toBe(false);
  });

  it("verified payment with no human approval still blocks", async () => {
    const { canAuthorizeMatterMail } = await import("@/domain/gold-standard");

    const repo = createMockRepo(() => verifiedEvidence());
    const paymentResult = await verifyPaymentForFulfillment("user-1", "matter-1", repo);

    const cleanAnalysis = {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [],
      findings: [
        { id: "f1", state: "confirmed", title: "OK", detail: "OK", severity: "low" },
      ],
      evidence: [],
      timeline: [],
      strategy: [],
      blockingIssues: [],
      risks: [],
      generationProvenance: null,
    } as never;

    expect(
      canAuthorizeMatterMail({
        analysis: cleanAnalysis,
        draftValidated: true,
        humanApproved: false, // no human approval
        recipientComplete: true,
        paymentComplete: paymentResult.paymentVerified,
      }),
    ).toBe(false);
  });

  it("verified payment with incomplete recipient still blocks", async () => {
    const { canAuthorizeMatterMail } = await import("@/domain/gold-standard");

    const repo = createMockRepo(() => verifiedEvidence());
    const paymentResult = await verifyPaymentForFulfillment("user-1", "matter-1", repo);

    const cleanAnalysis = {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [],
      findings: [
        { id: "f1", state: "confirmed", title: "OK", detail: "OK", severity: "low" },
      ],
      evidence: [],
      timeline: [],
      strategy: [],
      blockingIssues: [],
      risks: [],
      generationProvenance: null,
    } as never;

    expect(
      canAuthorizeMatterMail({
        analysis: cleanAnalysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: false, // incomplete recipient
        paymentComplete: paymentResult.paymentVerified,
      }),
    ).toBe(false);
  });

  it("all six gates passing with verified payment authorizes", async () => {
    const { canAuthorizeMatterMail } = await import("@/domain/gold-standard");

    const repo = createMockRepo(() => verifiedEvidence());
    const paymentResult = await verifyPaymentForFulfillment("user-1", "matter-1", repo);

    const cleanAnalysis = {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [],
      findings: [
        { id: "f1", state: "confirmed", title: "OK", detail: "OK", severity: "low" },
      ],
      evidence: [],
      timeline: [],
      strategy: [],
      blockingIssues: [],
      risks: [],
      generationProvenance: null,
    } as never;

    expect(
      canAuthorizeMatterMail({
        analysis: cleanAnalysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: paymentResult.paymentVerified,
      }),
    ).toBe(true);
  });
});
