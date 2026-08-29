import { describe, expect, it } from "vitest";
import {
  canTransitionMatter,
  transitionMatter,
  type PrivateOfficeMatter,
} from "./matter";

const baseMatter: PrivateOfficeMatter = {
  id: "matter-1",
  ownerId: "user-1",
  workflowId: "contractor-dispute",
  documentId: "doc-1",
  title: "Construction Defect — 123 Main Street",
  status: "review",
  version: 3,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  approvedAt: null,
  approvedDraftHash: null,
  draftHash: null,
  submittedAt: null,
  providerOrderId: null,
  trackingNumber: null,
  proofHash: null,
};

const draftHash = "abc123def456";

describe("matter lifecycle state machine", () => {
  it("records approval time and draft hash when approval is granted", () => {
    const withDraft = { ...baseMatter, draftHash };
    const next = transitionMatter(
      withDraft,
      "approved",
      "2026-08-20T15:00:00.000Z",
      { draftHash },
    );
    expect(next.status).toBe("approved");
    expect(next.approvedAt).toBe("2026-08-20T15:00:00.000Z");
    expect(next.approvedDraftHash).toBe(draftHash);
    expect(next.version).toBe(4);
  });

  it("requires a draft hash for approval", () => {
    expect(() => transitionMatter(baseMatter, "approved")).toThrow(
      /draft hash/,
    );
  });

  it("uses existing draftHash on matter when approving without explicit field", () => {
    const withDraft = { ...baseMatter, draftHash };
    const next = transitionMatter(withDraft, "approved");
    expect(next.approvedDraftHash).toBe(draftHash);
  });

  it("requires a provider order before submission", () => {
    const approved = transitionMatter({ ...baseMatter, draftHash }, "approved");
    const paymentPending = transitionMatter(approved, "payment_pending");
    expect(() => transitionMatter(paymentPending, "submitted")).toThrow(
      /providerOrderId/,
    );
  });

  it("records submission time when submitted with provider order", () => {
    const approved = transitionMatter({ ...baseMatter, draftHash }, "approved");
    const paymentPending = transitionMatter(approved, "payment_pending");
    const submitted = transitionMatter(paymentPending, "submitted", undefined, {
      providerOrderId: "order-1",
    });
    expect(submitted.status).toBe("submitted");
    expect(submitted.submittedAt).toBeTruthy();
    expect(submitted.providerOrderId).toBe("order-1");
  });

  it("requires tracking before tracking state and proof before completion", () => {
    const approved = transitionMatter({ ...baseMatter, draftHash }, "approved");
    const paymentPending = transitionMatter(approved, "payment_pending");
    const submitted = transitionMatter(paymentPending, "submitted", undefined, {
      providerOrderId: "order-1",
    });
    expect(() => transitionMatter(submitted, "tracking")).toThrow(
      /trackingNumber/,
    );
    const tracking = transitionMatter(submitted, "tracking", undefined, {
      trackingNumber: "TRK-1",
    });
    expect(() => transitionMatter(tracking, "completed")).toThrow(/proofHash/);
    const completed = transitionMatter(tracking, "completed", undefined, {
      proofHash: "hash-1",
    });
    expect(completed.proofHash).toBe("hash-1");
  });

  it("rejects invalid lifecycle jumps", () => {
    expect(() => transitionMatter(baseMatter, "completed")).toThrow(
      /Invalid matter transition/,
    );
    expect(() => transitionMatter(baseMatter, "submitted")).toThrow(
      /Invalid matter transition/,
    );
    expect(() => transitionMatter(baseMatter, "tracking")).toThrow(
      /Invalid matter transition/,
    );
  });

  it("rejects transition from completed (terminal state)", () => {
    const approved = transitionMatter({ ...baseMatter, draftHash }, "approved");
    const paymentPending = transitionMatter(approved, "payment_pending");
    const submitted = transitionMatter(paymentPending, "submitted", undefined, {
      providerOrderId: "order-1",
    });
    const tracking = transitionMatter(submitted, "tracking", undefined, {
      trackingNumber: "TRK-1",
    });
    const completed = transitionMatter(tracking, "completed", undefined, {
      proofHash: "hash-1",
    });
    expect(() => transitionMatter(completed, "draft")).toThrow(
      /Invalid matter transition/,
    );
    expect(() => transitionMatter(completed, "review")).toThrow(
      /Invalid matter transition/,
    );
  });

  it("rejects transition from cancelled (terminal state)", () => {
    const draft: PrivateOfficeMatter = {
      ...baseMatter,
      status: "draft",
      version: 1,
    };
    const cancelled = transitionMatter(draft, "cancelled");
    expect(() => transitionMatter(cancelled, "validated")).toThrow(
      /Invalid matter transition/,
    );
  });

  it("allows failed to transition back to review or payment_pending", () => {
    expect(canTransitionMatter("failed", "review")).toBe(true);
    expect(canTransitionMatter("failed", "payment_pending")).toBe(true);
    expect(canTransitionMatter("failed", "cancelled")).toBe(true);
  });

  it("allows approved to transition back to review (draft invalidation)", () => {
    expect(canTransitionMatter("approved", "review")).toBe(true);
  });

  it("increments version on every transition", () => {
    const draft: PrivateOfficeMatter = {
      ...baseMatter,
      status: "draft",
      version: 1,
    };
    const validated = transitionMatter(draft, "validated");
    expect(validated.version).toBe(2);
    const review = transitionMatter(validated, "review");
    expect(review.version).toBe(3);
  });

  it("preserves draftHash through transitions that don't modify the draft", () => {
    const draft: PrivateOfficeMatter = {
      ...baseMatter,
      status: "draft",
      version: 1,
      draftHash,
    };
    const validated = transitionMatter(draft, "validated");
    expect(validated.draftHash).toBe(draftHash);
  });
});

describe("approval version integrity", () => {
  it("approvedDraftHash is set to the draft hash at approval time", () => {
    const withDraft = { ...baseMatter, draftHash };
    const approved = transitionMatter(withDraft, "approved", undefined, {
      draftHash,
    });
    expect(approved.approvedDraftHash).toBe(draftHash);
  });

  it("if draftHash changes after approval, approvedDraftHash stays as the original", () => {
    const withDraft = { ...baseMatter, draftHash };
    const approved = transitionMatter(withDraft, "approved", undefined, {
      draftHash,
    });
    // Simulate draft regeneration: update draftHash but not approvedDraftHash
    const modified = { ...approved, draftHash: "different-hash-789" };
    expect(modified.approvedDraftHash).toBe(draftHash);
    expect(modified.draftHash).toBe("different-hash-789");
    expect(modified.approvedDraftHash).not.toBe(modified.draftHash);
  });

  it("approved matter can transition back to review when draft changes", () => {
    const withDraft = { ...baseMatter, draftHash };
    const approved = transitionMatter(withDraft, "approved", undefined, {
      draftHash,
    });
    // After draft change, matter goes back to review
    expect(canTransitionMatter("approved", "review")).toBe(true);
    const backToReview = transitionMatter(approved, "review");
    expect(backToReview.status).toBe("review");
    // approvedDraftHash still holds the old hash — must re-approve with new hash
    expect(backToReview.approvedDraftHash).toBe(draftHash);
  });
});
