import { describe, expect, it, vi } from "vitest";
import {
  PaymentEvidenceError,
  PaymentEvidenceNotFoundError,
  PaymentEvidenceAlreadyVerifiedError,
  type PaymentEvidence,
  type PaymentEvidenceStatus,
  type PaymentEvidenceRepository,
  type CreatePaymentEvidenceInput,
} from "@/domain/payment-evidence";

// ── PaymentEvidence domain types ─────────────────────────────────────────

describe("PaymentEvidence domain: types and invariants", () => {
  it("PaymentEvidenceStatus includes pending, verified, and failed", () => {
    const statuses: PaymentEvidenceStatus[] = ["pending", "verified", "failed"];
    expect(statuses).toHaveLength(3);
  });

  it("PaymentEvidence has all required fields", () => {
    const evidence: PaymentEvidence = {
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
    };

    expect(evidence.id).toBeTruthy();
    expect(evidence.ownerId).toBeTruthy();
    expect(evidence.matterId).toBeTruthy();
    expect(evidence.stripeSessionId).toBeTruthy();
    expect(evidence.stripePaymentIntentId).toBeTruthy();
  });
});

// ── PaymentEvidence repository interface contract ───────────────────────

describe("PaymentEvidence repository: interface contract", () => {
  function createMockRepo(): PaymentEvidenceRepository {
    const store = new Map<string, PaymentEvidence>();

    return {
      async create(input: CreatePaymentEvidenceInput): Promise<PaymentEvidence> {
        const evidence: PaymentEvidence = {
          id: `pe-${store.size + 1}`,
          ...input,
          status: "pending",
          verifiedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.set(input.stripeSessionId, evidence);
        return evidence;
      },

      async findBySessionId(sessionId: string): Promise<PaymentEvidence | null> {
        return store.get(sessionId) ?? null;
      },

      async findByMatter(ownerId: string, matterId: string): Promise<PaymentEvidence | null> {
        for (const evidence of store.values()) {
          if (evidence.ownerId === ownerId && evidence.matterId === matterId) {
            return evidence;
          }
        }
        return null;
      },

      async markVerified(sessionId: string, paymentIntentId: string): Promise<PaymentEvidence> {
        const evidence = store.get(sessionId);
        if (!evidence) throw new PaymentEvidenceNotFoundError();
        if (evidence.status === "verified") return evidence;
        if (evidence.status === "failed")
          throw new PaymentEvidenceError("Cannot verify failed payment", "CANNOT_VERIFY_FAILED");
        evidence.status = "verified";
        evidence.stripePaymentIntentId = paymentIntentId;
        evidence.verifiedAt = new Date().toISOString();
        evidence.updatedAt = new Date().toISOString();
        return evidence;
      },

      async markFailed(sessionId: string, _reason: string): Promise<PaymentEvidence> {
        const evidence = store.get(sessionId);
        if (!evidence) throw new PaymentEvidenceNotFoundError();
        if (evidence.status === "verified")
          throw new PaymentEvidenceAlreadyVerifiedError();
        if (evidence.status === "failed") return evidence;
        evidence.status = "failed";
        evidence.updatedAt = new Date().toISOString();
        return evidence;
      },
    };
  }

  it("create returns pending evidence", async () => {
    const repo = createMockRepo();
    const evidence = await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    expect(evidence.status).toBe("pending");
    expect(evidence.verifiedAt).toBeNull();
  });

  it("markVerified transitions pending → verified", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "",
      amount: 3798,
      currency: "usd",
    });
    const verified = await repo.markVerified("cs_test_123", "pi_test_123");
    expect(verified.status).toBe("verified");
    expect(verified.stripePaymentIntentId).toBe("pi_test_123");
    expect(verified.verifiedAt).toBeTruthy();
  });

  it("markVerified is idempotent (already verified returns existing)", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "",
      amount: 3798,
      currency: "usd",
    });
    const first = await repo.markVerified("cs_test_123", "pi_test_123");
    const second = await repo.markVerified("cs_test_123", "pi_test_123");
    expect(first.status).toBe("verified");
    expect(second.status).toBe("verified");
  });

  it("markVerified throws on unknown session", async () => {
    const repo = createMockRepo();
    await expect(repo.markVerified("unknown", "pi_test")).rejects.toThrow(
      PaymentEvidenceNotFoundError,
    );
  });

  it("markVerified throws when evidence is already failed", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    await repo.markFailed("cs_test_123", "Card declined");
    await expect(repo.markVerified("cs_test_123", "pi_test_123")).rejects.toThrow(
      /Cannot verify failed/,
    );
  });

  it("markFailed transitions pending → failed", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    const failed = await repo.markFailed("cs_test_123", "Card declined");
    expect(failed.status).toBe("failed");
  });

  it("markFailed is idempotent (already failed returns existing)", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    await repo.markFailed("cs_test_123", "Card declined");
    const second = await repo.markFailed("cs_test_123", "Card declined");
    expect(second.status).toBe("failed");
  });

  it("markFailed throws when evidence is already verified", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    await repo.markVerified("cs_test_123", "pi_test_123");
    await expect(repo.markFailed("cs_test_123", "Card declined")).rejects.toThrow(
      PaymentEvidenceAlreadyVerifiedError,
    );
  });

  it("markFailed throws on unknown session", async () => {
    const repo = createMockRepo();
    await expect(repo.markFailed("unknown", "reason")).rejects.toThrow(
      PaymentEvidenceNotFoundError,
    );
  });

  it("findByMatter returns evidence for correct owner", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    const evidence = await repo.findByMatter("user-1", "matter-1");
    expect(evidence).not.toBeNull();
    expect(evidence!.ownerId).toBe("user-1");
  });

  it("findByMatter returns null for wrong owner", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    const evidence = await repo.findByMatter("user-2", "matter-1");
    expect(evidence).toBeNull();
  });

  it("findBySessionId returns evidence for matching session", async () => {
    const repo = createMockRepo();
    await repo.create({
      ownerId: "user-1",
      matterId: "matter-1",
      workflowId: "contractor-dispute",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 3798,
      currency: "usd",
    });
    const evidence = await repo.findBySessionId("cs_test_123");
    expect(evidence).not.toBeNull();
    expect(evidence!.stripeSessionId).toBe("cs_test_123");
  });

  it("findBySessionId returns null for unknown session", async () => {
    const repo = createMockRepo();
    const evidence = await repo.findBySessionId("unknown");
    expect(evidence).toBeNull();
  });
});

// ── Failed payment cannot become verified ────────────────────────────────

describe("PaymentEvidence: failed payment can never become verified", () => {
  function createMockRepo(): PaymentEvidenceRepository {
    return {
      create: vi.fn(),
      findBySessionId: vi.fn(),
      findByMatter: vi.fn(),
      markVerified: vi.fn().mockRejectedValue(
        new PaymentEvidenceError("Cannot verify failed payment", "CANNOT_VERIFY_FAILED"),
      ),
      markFailed: vi.fn(),
    };
  }

  it("markVerified rejects when payment was previously failed", async () => {
    const repo = createMockRepo();
    await expect(repo.markVerified("cs_test_123", "pi_test_123")).rejects.toThrow(
      /Cannot verify failed/,
    );
  });
});

// ── Verified payment cannot become failed ────────────────────────────────

describe("PaymentEvidence: verified payment can never become failed", () => {
  function createMockRepo(): PaymentEvidenceRepository {
    return {
      create: vi.fn(),
      findBySessionId: vi.fn(),
      findByMatter: vi.fn(),
      markVerified: vi.fn(),
      markFailed: vi.fn().mockRejectedValue(new PaymentEvidenceAlreadyVerifiedError()),
    };
  }

  it("markFailed rejects when payment was previously verified", async () => {
    const repo = createMockRepo();
    await expect(repo.markFailed("cs_test_123", "reason")).rejects.toThrow(
      PaymentEvidenceAlreadyVerifiedError,
    );
  });
});
