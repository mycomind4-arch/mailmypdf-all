import { describe, expect, it } from "vitest";
import { transitionCase, type DisputeCase } from "./case";

const baseCase: DisputeCase = {
  id: "case-1", ownerId: "user-1", workflowId: "debt-validation", documentId: "doc-1", status: "review", version: 3,
  createdAt: "2026-08-20T00:00:00.000Z", updatedAt: "2026-08-20T00:00:00.000Z", approvedAt: null, submittedAt: null,
  providerOrderId: null, trackingNumber: null, proofHash: null,
};

describe("dispute case lifecycle", () => {
  it("records approval time when approval is granted", () => {
    const next = transitionCase(baseCase, "approved", "2026-08-20T15:00:00.000Z");
    expect(next.status).toBe("approved");
    expect(next.approvedAt).toBe("2026-08-20T15:00:00.000Z");
    expect(next.version).toBe(4);
  });

  it("requires a provider order before submission", () => {
    const approved = transitionCase(baseCase, "approved");
    const paymentPending = transitionCase(approved, "payment_pending");
    expect(() => transitionCase(paymentPending, "submitted")).toThrow(/providerOrderId/);
  });

  it("requires tracking before tracking state and proof before completion", () => {
    const approved = transitionCase(baseCase, "approved");
    const paymentPending = transitionCase(approved, "payment_pending");
    const submitted = transitionCase(paymentPending, "submitted", undefined, { providerOrderId: "order-1" });
    expect(() => transitionCase(submitted, "tracking")).toThrow(/trackingNumber/);
    const tracking = transitionCase(submitted, "tracking", undefined, { trackingNumber: "TRK-1" });
    expect(() => transitionCase(tracking, "completed")).toThrow(/proofHash/);
  });

  it("rejects invalid lifecycle jumps", () => {
    expect(() => transitionCase(baseCase, "completed")).toThrow(/Invalid dispute case transition/);
  });
});
