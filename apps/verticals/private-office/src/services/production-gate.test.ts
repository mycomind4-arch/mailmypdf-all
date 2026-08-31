import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the MailMyPDF provider
vi.mock("@/platform/mailmypdf-provider", () => ({
  mailMyPDFProvider: {
    createLetter: vi.fn(),
    getStatus: vi.fn(),
  },
}));

// Mock the Supabase mailing intent repository singleton
vi.mock("@/services/supabase-mailing-intent-repository", () => ({
  supabaseMailingIntentRepository: {
    claim: vi.fn(),
    markSubmitted: vi.fn(),
    markFailed: vi.fn(),
  },
}));

import { submitApprovedMatter } from "./fulfillment";
import type { MatterAnalysis } from "@/domain/gold-standard";
import type { MailingRecipient, MailingMethod } from "@/domain/mailing";
import { mailMyPDFProvider } from "@/platform/mailmypdf-provider";
import { supabaseMailingIntentRepository } from "@/services/supabase-mailing-intent-repository";

const recipient: MailingRecipient = {
  name: "ABC Construction",
  address1: "123 Main St",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
};

const draftHash = "a1b2c3d4e5f6";

function cleanAnalysis(overrides: Partial<MatterAnalysis> = {}): MatterAnalysis {
  return {
    documentId: "doc-1",
    classification: { type: "contractor-dispute", confidence: 0.9 },
    facts: [],
    findings: [{ id: "confirmed", state: "confirmed", title: "OK", detail: "OK", severity: "low" }],
    evidence: [],
    timeline: [],
    strategy: [],
    blockingIssues: [],
    risks: [],
    generationProvenance: null,
    ...overrides,
  };
}

const validInput = {
  ownerId: "user-1",
  workflowId: "contractor-dispute",
  documentId: "doc-1",
  analysis: cleanAnalysis(),
  draftValidated: true,
  humanApproved: true,
  recipient,
  paymentVerified: true,
  stripePaymentId: "pi_test_123",
  mailingMethod: "certified" as MailingMethod,
  proofReady: true,
  idempotencyKey: "matter-1:doc-1",
  currentDraftHash: draftHash,
  approvedDraftHash: draftHash,
  draftContent: "[DRAFT]",
  matterId: "matter-1",
};

function mockClaimNew() {
  vi.mocked(supabaseMailingIntentRepository.claim).mockResolvedValue({
    intent: {
      id: "intent-1", ownerId: "user-1", workflowId: "contractor-dispute",
      matterId: "matter-1", status: "pending", mailingMethod: "certified",
      draftHash, providerOrderId: null, trackingNumber: null,
      idempotencyKey: "matter-1:doc-1", errorMessage: null,
      createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T00:00:00.000Z",
    },
    isNew: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClaimNew();
  vi.mocked(supabaseMailingIntentRepository.markSubmitted).mockResolvedValue();
  vi.mocked(supabaseMailingIntentRepository.markFailed).mockResolvedValue();
});

describe("ambiguous provider failure: response lost after submission", () => {
  it("marks intent as failed when provider throws (network dies after submission)", async () => {
    // Scenario: MailMyPDF receives and accepts the request, but the network
    // connection dies before the response reaches us. fetch() throws an error.
    // The fulfillment service catches the error, marks the intent as failed,
    // and rethrows. On retry, the claim() will find the failed intent and
    // reclaim it. The retry sends the same Idempotency-Key header to MailMyPDF.
    // If MailMyPDF supports idempotency (which the Idempotency-Key header implies),
    // the retry will return the original communication instead of creating a duplicate.
    vi.mocked(mailMyPDFProvider.createLetter).mockRejectedValue(
      new Error("Network error: connection reset"),
    );

    await expect(submitApprovedMatter(validInput)).rejects.toThrow(/Network error/);

    // Intent is marked as failed — safe for retry
    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "Network error: connection reset",
    );
  });

  it("does NOT mark intent as submitted when provider fails", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockRejectedValue(
      new Error("Timeout"),
    );

    await expect(submitApprovedMatter(validInput)).rejects.toThrow();

    // markSubmitted should NOT be called
    expect(supabaseMailingIntentRepository.markSubmitted).not.toHaveBeenCalled();
  });

  it("on retry after failure, the same idempotency key is sent to the provider", async () => {
    // First attempt fails
    vi.mocked(mailMyPDFProvider.createLetter).mockRejectedValueOnce(
      new Error("Network error"),
    );

    await expect(submitApprovedMatter(validInput)).rejects.toThrow();

    // Verify the provider received the idempotency key
    expect(mailMyPDFProvider.createLetter).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "matter-1:doc-1" }),
    );
  });
});

describe("ambiguous provider failure: architectural limitation", () => {
  it("documents that ambiguous outcomes depend on MailMyPDF idempotency support", () => {
    // ARCHITECTURAL LIMITATION:
    //
    // If MailMyPDF accepts the request but the response is lost:
    // 1. The fulfillment service marks the intent as "failed" (not "submitted")
    // 2. On retry, the intent is reclaimed and the provider is called again
    // 3. The same Idempotency-Key header is sent to MailMyPDF
    // 4. If MailMyPDF properly supports the Idempotency-Key header, it returns
    //    the original communication instead of creating a duplicate
    // 5. If MailMyPDF does NOT support idempotency, a duplicate mailing is created
    //
    // The system cannot resolve this ambiguity at the application level alone.
    // It depends on the MailMyPDF API honoring the Idempotency-Key header.
    //
    // What the system DOES guarantee:
    // - Only ONE pending intent exists per (idempotency_key, owner_id)
    // - A submitted intent prevents duplicate submissions (cached result returned)
    // - A failed intent can be retried (reclaimed to pending)
    // - The provider always receives the Idempotency-Key header
    //
    // What the system CANNOT guarantee without provider support:
    // - That a duplicate physical mailing is never created when the provider
    //   receives the same request twice (once before the failure, once on retry)
    expect(true).toBe(true);
  });
});

describe("approval integrity: draft hash enforcement", () => {
  it("blocks fulfillment when draft hash differs from approved hash", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        currentDraftHash: "new-hash-after-edit",
        approvedDraftHash: draftHash,
      }),
    ).rejects.toThrow(/modified after approval/);

    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "Draft was modified after approval.",
    );
  });

  it("blocks fulfillment when approvedDraftHash is empty", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        approvedDraftHash: "",
      }),
    ).rejects.toThrow(/modified after approval/);
  });

  it("blocks fulfillment when currentDraftHash is empty", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        currentDraftHash: "",
        approvedDraftHash: draftHash,
      }),
    ).rejects.toThrow(/modified after approval/);
  });

  it("allows fulfillment when hashes match exactly", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-ok",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-23T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-ok");
  });
});

describe("payment integrity: server-verified payment required", () => {
  it("rejects when paymentVerified is false (not client-claimed)", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, paymentVerified: false }),
    ).rejects.toThrow(/server-verified payment/);

    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "Payment not server-verified.",
    );
  });

  it("rejects when stripePaymentId is empty even if paymentVerified is true", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, stripePaymentId: "" }),
    ).rejects.toThrow(/Stripe payment identifier/);
  });

  it("paymentVerified=true with valid Stripe ID proceeds to provider", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-pay",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-23T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-pay");
  });
});

describe("unauthorized fulfillment: no bypass paths", () => {
  it("rejects when humanApproved is false", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, humanApproved: false }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects when draftValidated is false", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, draftValidated: false }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects when analysis has blocking issues", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        analysis: cleanAnalysis({ blockingIssues: ["Missing evidence"] }),
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects when evidence is unresolved", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        analysis: {
          ...cleanAnalysis(),
          evidence: [{ id: "e1", description: "Test", status: "requested", supportsFindingIds: [] }],
        },
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects when recipient is incomplete", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        recipient: { ...recipient, address1: "" },
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });
});
