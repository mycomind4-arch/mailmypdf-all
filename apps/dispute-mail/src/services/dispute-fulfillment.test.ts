import { describe, expect, it } from "vitest";
import { submitApprovedDispute } from "./dispute-fulfillment";

const analysis = {
  documentId: "doc-1",
  classification: { type: "credit-report", confidence: 1 },
  facts: [{ label: "bureau", value: "Equifax" }],
  findings: [{ id: "f1", state: "confirmed", title: "Disputed item", detail: "Supported", severity: "medium" }],
  evidence: [{ id: "e1", description: "Credit report excerpt", status: "verified", supportsFindingIds: ["f1"] }],
  strategy: ["Request investigation"],
  blockingIssues: [],
} as const;

describe("submitApprovedDispute", () => {
  it("fails before the provider when payment is not complete", async () => {
    await expect(submitApprovedDispute({
      workflowId: "credit-report",
      documentId: "doc-1",
      analysis,
      draftValidated: true,
      humanApproved: true,
      recipient: { name: "Equifax", address1: "1 Main", city: "Dispute City", state: "PA", postalCode: "19000" },
      paymentComplete: false,
      stripePaymentId: "",
      mailingMethod: "certified",
      proofReady: true,
      idempotencyKey: "credit-report:doc-1",
    })).rejects.toThrow(/payment/);
  });

  it("fails closed when no verified Stripe payment identifier exists", async () => {
    await expect(submitApprovedDispute({
      workflowId: "credit-report",
      documentId: "doc-1",
      analysis,
      draftValidated: true,
      humanApproved: true,
      recipient: { name: "Equifax", address1: "1 Main", city: "Dispute City", state: "PA", postalCode: "19000" },
      paymentComplete: true,
      stripePaymentId: "",
      mailingMethod: "certified",
      proofReady: true,
      idempotencyKey: "credit-report:doc-1",
    })).rejects.toThrow(/Stripe payment/);
  });
});
