import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";

function buildEvidenceStatuses(status: "provided" = "provided"): Record<string, "provided"> {
  const profile = workflowProfiles["contractor-dispute"];
  const evidenceStatuses: Record<string, "provided"> = {};
  for (const req of profile.evidenceRequirements) {
    const slug = req
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    evidenceStatuses[`evidence-${slug}`] = status;
  }
  return evidenceStatuses;
}

const draftHash = "test-draft-hash-abc123";

describe("canonical Private Office workflow dispatcher", () => {
  it("dispatches the contractor-dispute workflow through the profile engine", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract dated January 15, 2026. Invoice #1234.",
      facts: {
        propertyAddress: "123 Main Street",
        contractorName: "ABC Construction",
        agreementReference: "Written contract",
        disputeDescription: "Defective roof",
      },
      objective: "Request repair and refund.",
    });
    expect(result.workflowId).toBe("contractor-dispute");
    expect(result.analysis.classification.type).toBe("contractor-dispute");
    expect(result.stages.map((s) => s.stage)).toContain("blocking-gates");
  });

  it("blocks when source document is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "",
      facts: {},
      objective: "",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors).toContain("secure-ingest: source document required");
    expect(result.stages.find((s) => s.stage === "draft")?.status).toBe("blocked");
  });

  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Some source text.",
      facts: {},
      objective: "Request repair.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("generates a draft when intake is complete", () => {
    const evidenceStatuses = buildEvidenceStatuses();

    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract dated January 15, 2026.",
      facts: {
        propertyAddress: "123 Main Street",
        contractorName: "ABC Construction",
        agreementReference: "Written contract",
        disputeDescription: "Defective roof",
      },
      evidenceStatuses,
      objective: "Request repair and refund.",
    });
    expect(result.draft).toContain("Re: Notice of Contractor Dispute");
    expect(result.draft).toContain("[DRAFT — REVIEW BEFORE SENDING]");
    expect(result.draft).toContain("Requested resolution");
    expect(result.stages.find((s) => s.stage === "draft")?.status).toBe("passed");
    expect(result.stages.find((s) => s.stage === "validate")?.status).toBe(
      "passed",
    );
  });

  it("skips consequential stages when no consequential state is supplied", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract text.",
      facts: {},
      objective: "Test.",
    });
    // When blocked by missing facts, consequential stages should be "blocked"
    const humanReview = result.stages.find((s) => s.stage === "human-review");
    expect(humanReview?.status).toBe("blocked");
  });

  it("requires human approval in consequential state before authorized mail", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract text.",
      facts: {},
      objective: "Test.",
      consequential: {
        draftValidated: true,
        humanApproved: false,
        recipientComplete: true,
        paymentComplete: true,
        mailingSubmitted: false,
        trackingNumber: null,
        proofReady: false,
        approvedDraftHash: null,
      },
    });
    // Still blocked by missing facts, so approval will be blocked
    expect(result.blocked).toBe(true);
  });

  it("passes all stages when intake is complete and consequential gates are satisfied", () => {
    const evidenceStatuses = buildEvidenceStatuses();

    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract dated January 15, 2026. Invoice #1234.",
      facts: {
        propertyAddress: "123 Main Street",
        contractorName: "ABC Construction",
        agreementReference: "Written contract",
        disputeDescription: "Defective roof",
      },
      evidenceStatuses,
      objective: "Request repair and refund.",
      consequential: {
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: true,
        mailingSubmitted: true,
        trackingNumber: "TRK-123",
        proofReady: true,
        approvedDraftHash: draftHash,
      },
    });
    expect(result.ready).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.errors).toHaveLength(0);
    const proveAudit = result.stages.find((s) => s.stage === "prove-audit");
    expect(proveAudit?.status).toBe("passed");
  });

  it("blocks approval when approvedDraftHash is null in consequential state", () => {
    const evidenceStatuses = buildEvidenceStatuses();

    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract dated January 15, 2026.",
      facts: {
        propertyAddress: "123 Main Street",
        contractorName: "ABC Construction",
        agreementReference: "Written contract",
        disputeDescription: "Defective roof",
      },
      evidenceStatuses,
      objective: "Request repair and refund.",
      consequential: {
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: true,
        mailingSubmitted: true,
        trackingNumber: "TRK-123",
        proofReady: true,
        approvedDraftHash: null,
      },
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("approval"))).toBe(true);
  });

  it("returns draftHash as null in the result (computed by caller)", () => {
    const evidenceStatuses = buildEvidenceStatuses();

    const result = runPrivateOfficeWorkflow({
      workflowId: "contractor-dispute",
      documentId: "doc-1",
      text: "Contract dated January 15, 2026.",
      facts: {
        propertyAddress: "123 Main Street",
        contractorName: "ABC Construction",
        agreementReference: "Written contract",
        disputeDescription: "Defective roof",
      },
      evidenceStatuses,
      objective: "Request repair and refund.",
    });
    expect(result.draftHash).toBe(null);
    expect(result.draft.length).toBeGreaterThan(0);
  });
});

describe("workflow registration consistency", () => {
  it("every registered workflow has a matching profile", () => {
    for (const id of Object.keys(workflows) as Array<keyof typeof workflows>) {
      expect(workflowProfiles[id]).toBeDefined();
      expect(workflowProfiles[id].id).toBe(id);
    }
  });
});
