import { describe, expect, it } from "vitest";
import { runProfiledDisputeWorkflow } from "./workflow-executor";

describe("profile-driven dispute workflow executor", () => {
  it("runs distinct workflow IDs through the same evidence-first engine", () => {
    const ids = ["debt-validation", "credit-report-collections", "medical-collections", "subscription-billing"] as const;
    for (const workflowId of ids) {
      const result = runProfiledDisputeWorkflow({
        workflowId,
        documentId: `${workflowId}-doc`,
        text: "Sample source document with account and billing information.",
        facts: {
          debtValidation: "Collector ABC",
          creditReportCollections: "Equifax collection account",
          medicalCollections: "Provider billing account",
          subscriptionBilling: "Subscription account",
          requestedResolution: "Investigate and correct the disputed information",
        },
        objective: "Investigate the disputed information and provide the requested correction.",
      });
      expect(result.workflowId).toBe(workflowId);
      expect(result.analysis.classification.type).toBe(workflowId);
      expect(result.stages.some((stage) => stage.stage === "evidence")).toBe(true);
      expect(result.stages.some((stage) => stage.stage === "blocking-gates")).toBe(true);
    }
  });

  it("fails closed when required source or facts are missing", () => {
    const result = runProfiledDisputeWorkflow({ workflowId: "debt-validation", documentId: "missing-input-doc", text: "", facts: {}, objective: "" });
    expect(result.ready).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.stages.find((stage) => stage.stage === "authorized-mail")?.status).toBe("blocked");
  });

  it("requires explicit approval, payment, provider submission, tracking, and proof", () => {
    const evidenceStatuses = {
      "evidence-credit-report-page-or-excerpt": "verified",
      "evidence-identity-address-support-when-relevant": "verified",
      "evidence-documents-establishing-the-correct-information": "verified",
    } as const;
    const input = { workflowId: "credit-report" as const, documentId: "credit-doc", text: "Credit report source text", facts: { creditBureau: "Equifax", accountReference: "ABC123", reportingError: "Balance is incorrect", requestedCorrection: "Correct the balance" }, evidenceStatuses, objective: "Correct the reported balance." };
    const withoutApproval = runProfiledDisputeWorkflow(input, { draftValidated: true, humanApproved: false, recipientComplete: true, paymentComplete: true, mailingSubmitted: true, trackingNumber: "trk-1", proofReady: true });
    expect(withoutApproval.ready).toBe(false);
    expect(withoutApproval.stages.find((stage) => stage.stage === "approval")?.status).toBe("failed");

    const withApprovalButNoProof = runProfiledDisputeWorkflow(input, { draftValidated: true, humanApproved: true, recipientComplete: true, paymentComplete: true, mailingSubmitted: true, trackingNumber: null, proofReady: false });
    expect(withApprovalButNoProof.ready).toBe(false);
    expect(withApprovalButNoProof.stages.find((stage) => stage.stage === "prove-audit")?.status).toBe("failed");
  });

  it("reaches ready only when verified evidence and every consequential gate is complete", () => {
    const evidenceStatuses = {
      "evidence-credit-report-page-or-excerpt": "verified",
      "evidence-identity-address-support-when-relevant": "verified",
      "evidence-documents-establishing-the-correct-information": "verified",
    } as const;

    const result = runProfiledDisputeWorkflow({
      workflowId: "credit-report",
      documentId: "credit-doc-complete",
      text: "Equifax credit report showing account ABC123 and incorrect balance.",
      facts: { creditBureau: "Equifax", accountReference: "ABC123", reportingError: "Balance is incorrect", requestedCorrection: "Correct the balance" },
      evidenceStatuses,
      objective: "Correct the reported balance.",
    }, {
      draftValidated: true,
      humanApproved: true,
      recipientComplete: true,
      paymentComplete: true,
      mailingSubmitted: true,
      trackingNumber: "trk-complete",
      proofReady: true,
    });

    expect(result.ready).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.errors).toEqual([]);
    expect(result.stages.find((stage) => stage.stage === "authorized-mail")?.status).toBe("passed");
    expect(result.stages.find((stage) => stage.stage === "prove-audit")?.status).toBe("passed");
  });
});
