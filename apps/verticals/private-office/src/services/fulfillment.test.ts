import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the MailMyPDF provider before importing the fulfillment service
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
import { MailingIntentConflictError } from "@/domain/mailing-intent-repository";

const recipient: MailingRecipient = {
  name: "ABC Construction",
  address1: "123 Main St",
  city: "Springfield",
  state: "IL",
  postalCode: "62701",
};

const draftHash = "a1b2c3d4e5f6";
const draftContent = "[DRAFT] Test letter content";

function cleanAnalysis(overrides: Partial<MatterAnalysis> = {}): MatterAnalysis {
  return {
    documentId: "doc-1",
    classification: { type: "contractor-dispute", confidence: 0.9 },
    facts: [],
    findings: [
      {
        id: "confirmed",
        state: "confirmed",
        title: "OK",
        detail: "OK",
        severity: "low",
      },
    ],
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
  draftContent,
  matterId: "matter-1",
};

function mockClaimNew() {
  vi.mocked(supabaseMailingIntentRepository.claim).mockResolvedValue({
    intent: {
      id: "intent-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
      matterId: "matter-1",
      status: "pending",
      mailingMethod: "certified",
      draftHash,
      providerOrderId: null,
      trackingNumber: null,
      idempotencyKey: "matter-1:doc-1",
      errorMessage: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    },
    isNew: true,
  });
}

function mockClaimExisting(providerOrderId: string) {
  vi.mocked(supabaseMailingIntentRepository.claim).mockResolvedValue({
    intent: {
      id: "intent-1",
      ownerId: "user-1",
      workflowId: "contractor-dispute",
      matterId: "matter-1",
      status: "submitted",
      mailingMethod: "certified",
      draftHash,
      providerOrderId,
      trackingNumber: "TRK-CACHED",
      idempotencyKey: "matter-1:doc-1",
      errorMessage: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:01:00.000Z",
    },
    isNew: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClaimNew();
  vi.mocked(supabaseMailingIntentRepository.markSubmitted).mockResolvedValue();
  vi.mocked(supabaseMailingIntentRepository.markFailed).mockResolvedValue();
});

describe("fulfillment: approval-gated mailing", () => {
  it("submits when all gates are satisfied", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-1",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      trackingNumber: "TRK-1",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-1");
    expect(result.status.state).toBe("submitted");
    // Intent should be marked as submitted
    expect(supabaseMailingIntentRepository.markSubmitted).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "comm-1",
      "TRK-1",
    );
  });

  it("rejects submission when human approval is missing", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, humanApproved: false }),
    ).rejects.toThrow(/prerequisites are incomplete/);
    // Intent should be marked as failed
    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalled();
  });

  it("rejects submission when draft is not validated", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, draftValidated: false }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects submission when analysis has blocking issues", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        analysis: cleanAnalysis({ blockingIssues: ["Missing evidence"] }),
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects submission when evidence is unresolved", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        analysis: cleanAnalysis({
          evidence: [
            {
              id: "e1",
              description: "Test",
              status: "requested",
              supportsFindingIds: [],
            },
          ],
        }),
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects submission when recipient is incomplete", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        recipient: { ...recipient, address1: "" },
      }),
    ).rejects.toThrow(/prerequisites are incomplete/);
  });

  it("rejects submission when payment is not verified", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, paymentVerified: false }),
    ).rejects.toThrow(/server-verified payment/);
  });

  it("rejects submission when Stripe payment ID is empty", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, stripePaymentId: "" }),
    ).rejects.toThrow(/Stripe payment identifier/);
  });

  it("rejects submission when idempotency key is empty", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, idempotencyKey: "" }),
    ).rejects.toThrow(/idempotency key/);
  });

  it("calls the provider with correct matter type", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-2",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    await submitApprovedMatter(validInput);
    expect(mailMyPDFProvider.createLetter).toHaveBeenCalledWith(
      expect.objectContaining({ matterType: "private-office" }),
    );
  });
});

describe("fulfillment: draft version integrity", () => {
  it("rejects submission when draft was modified after approval", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        currentDraftHash: "modified-hash",
        approvedDraftHash: draftHash,
      }),
    ).rejects.toThrow(/modified after approval/);
    // Intent should be marked as failed
    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "Draft was modified after approval.",
    );
  });

  it("rejects submission when approvedDraftHash is null", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        approvedDraftHash: "",
      }),
    ).rejects.toThrow(/modified after approval/);
  });

  it("accepts submission when hashes match exactly", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-3",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-3");
  });
});

describe("fulfillment: durable idempotency outbox", () => {
  it("returns cached result when intent was already submitted (idempotent)", async () => {
    mockClaimExisting("comm-cached");

    const result = await submitApprovedMatter(validInput);

    expect(result.providerOrderId).toBe("comm-cached");
    // Provider should NOT be called — cached result returned
    expect(mailMyPDFProvider.createLetter).not.toHaveBeenCalled();
    expect(mailMyPDFProvider.getStatus).not.toHaveBeenCalled();
  });

  it("throws conflict when a pending intent exists (concurrent request)", async () => {
    vi.mocked(supabaseMailingIntentRepository.claim).mockRejectedValue(
      new MailingIntentConflictError(),
    );

    await expect(submitApprovedMatter(validInput)).rejects.toThrow(
      /already in progress/,
    );
    // Provider should NOT be called
    expect(mailMyPDFProvider.createLetter).not.toHaveBeenCalled();
  });

  it("retries when a failed intent is reclaimed", async () => {
    // Simulate: first claim returns failed intent, reclaims it to pending
    vi.mocked(supabaseMailingIntentRepository.claim).mockResolvedValueOnce({
      intent: {
        id: "intent-1",
        ownerId: "user-1",
        workflowId: "contractor-dispute",
        matterId: "matter-1",
        status: "pending",
        mailingMethod: "certified",
        draftHash,
        providerOrderId: null,
        trackingNumber: null,
        idempotencyKey: "matter-1:doc-1",
        errorMessage: null,
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
      },
      isNew: true,
    });

    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-retry",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-retry");
    expect(supabaseMailingIntentRepository.markSubmitted).toHaveBeenCalled();
  });

  it("allows different submissions with different idempotency keys", async () => {
    mockClaimNew();
    vi.mocked(mailMyPDFProvider.createLetter)
      .mockResolvedValueOnce({ providerOrderId: "comm-A" })
      .mockResolvedValueOnce({ providerOrderId: "comm-B" });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    const first = await submitApprovedMatter(validInput);
    vi.clearAllMocks();
    mockClaimNew();
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-B",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });
    vi.mocked(supabaseMailingIntentRepository.markSubmitted).mockResolvedValue();

    const second = await submitApprovedMatter({
      ...validInput,
      idempotencyKey: "matter-2:doc-2",
    });

    expect(first.providerOrderId).toBe("comm-A");
    expect(second.providerOrderId).toBe("comm-B");
  });
});

describe("fulfillment: provider failure", () => {
  it("rejects on provider failure and marks intent as failed", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockRejectedValue(
      new Error("MailMyPDF API error 500"),
    );

    await expect(submitApprovedMatter(validInput)).rejects.toThrow(
      /MailMyPDF API error/,
    );
    // Intent should be marked as failed for retry
    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalledWith(
      "matter-1:doc-1",
      "user-1",
      "MailMyPDF API error 500",
    );
  });

  it("marks intent as failed on draft hash mismatch (not just rejection)", async () => {
    await expect(
      submitApprovedMatter({
        ...validInput,
        currentDraftHash: "modified",
        approvedDraftHash: draftHash,
      }),
    ).rejects.toThrow(/modified after approval/);
    expect(supabaseMailingIntentRepository.markFailed).toHaveBeenCalled();
  });
});

describe("fulfillment: payment integrity", () => {
  it("rejects when paymentVerified is false", async () => {
    await expect(
      submitApprovedMatter({ ...validInput, paymentVerified: false }),
    ).rejects.toThrow(/server-verified payment/);
  });

  it("accepts when paymentVerified is true with valid Stripe ID", async () => {
    vi.mocked(mailMyPDFProvider.createLetter).mockResolvedValue({
      providerOrderId: "comm-pay-ok",
    });
    vi.mocked(mailMyPDFProvider.getStatus).mockResolvedValue({
      state: "submitted",
      updatedAt: "2026-08-20T00:00:00.000Z",
    });

    const result = await submitApprovedMatter(validInput);
    expect(result.providerOrderId).toBe("comm-pay-ok");
  });
});
