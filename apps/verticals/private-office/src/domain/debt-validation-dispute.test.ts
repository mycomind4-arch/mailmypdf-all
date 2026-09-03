import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { isApprovalValid } from "./draft-provenance";
import { transitionMatter, type PrivateOfficeMatter } from "./matter";

const profile = workflowProfiles["debt-validation-dispute"];

function buildEvidenceStatuses(
  status: "provided" = "provided",
): Record<string, "provided"> {
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

const completeFacts: Record<string, string> = {
  debtCollectorName: "Mid-State Collection Services, LLC",
  consumerName: "Jane Q. Public",
  accountOrReferenceNumber: "AC-2026-04471",
  allegedDebtAmount: "$3,847.50",
  originalCreditorName: "Cascade Medical Center",
  disputeDescription:
    "Consumer does not recognize this debt. No prior account or service relationship with the original creditor is recalled. The amount and creditor are disputed.",
  collectorCommunicationDate: "August 12, 2026",
};

describe("debt-validation-dispute: workflow registration", () => {
  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("debt-validation-dispute");
  });

  it("has gold standard lifecycle", () => {
    expect(workflows["debt-validation-dispute"].lifecycle).toBe("gold");
  });

  it("belongs to the Financial family", () => {
    expect(profile.family).toBe("Financial");
  });
});

describe("debt-validation-dispute: intake and required facts", () => {
  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection notice text.",
      facts: {},
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    const requiredBlocking = result.errors.filter((e) =>
      profile.requiredFacts.some((req) => e.includes(req)),
    );
    expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
  });

  it("blocks when debt collector name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, debtCollectorName: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("debt collector name"))).toBe(true);
  });

  it("blocks when consumer name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, consumerName: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("consumer name"))).toBe(true);
  });

  it("blocks when account or reference number is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, accountOrReferenceNumber: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("account or reference number"))).toBe(true);
  });

  it("blocks when alleged debt amount is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, allegedDebtAmount: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("alleged debt amount"))).toBe(true);
  });

  it("blocks when original creditor name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, originalCreditorName: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("original creditor name"))).toBe(true);
  });

  it("blocks when dispute description is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, disputeDescription: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("dispute description"))).toBe(true);
  });

  it("blocks when collector communication date is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: { ...completeFacts, collectorCommunicationDate: "" },
      objective: "Request debt validation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("collector communication date"))).toBe(true);
  });

  it("does not block when all required facts are provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection notice text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request debt validation and cease collection.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("debt-validation-dispute: evidence and approval gates", () => {
  it("blocks approval when evidence is not provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: completeFacts,
      objective: "Request validation.",
    });
    expect(canApproveMatter(result.analysis)).toBe(false);
  });

  it("canApproveMatter passes when all blocking issues resolved and evidence provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      text: "Collection text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request validation and cease collection.",
    });
    expect(canApproveMatter(result.analysis)).toBe(true);
  });
});

describe("debt-validation-dispute: matter lifecycle", () => {
  it("can create and transition a debt-validation-dispute matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      title: "Debt Validation Dispute — Mid-State Collection Services, LLC",
      status: "draft",
      version: 1,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      approvedAt: null,
      approvedDraftHash: null,
      draftHash: null,
      submittedAt: null,
      providerOrderId: null,
      trackingNumber: null,
      proofHash: null,
    };

    const validated = transitionMatter(matter, "validated");
    expect(validated.status).toBe("validated");
    expect(validated.workflowId).toBe("debt-validation-dispute");

    const reviewed = transitionMatter(validated, "review");
    expect(reviewed.status).toBe("review");

    const approved = transitionMatter(reviewed, "approved", undefined, {
      draftHash: "hash-def",
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedDraftHash).toBe("hash-def");
  });

  it("rejects invalid transitions for a debt-validation-dispute matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "debt-validation-dispute",
      documentId: "doc-1",
      title: "Test",
      status: "completed",
      version: 1,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      approvedAt: null,
      approvedDraftHash: null,
      draftHash: null,
      submittedAt: null,
      providerOrderId: null,
      trackingNumber: null,
      proofHash: "proof-hash",
    };
    expect(() => transitionMatter(matter, "draft")).toThrow(
      /Invalid matter transition/,
    );
  });
});

describe("debt-validation-dispute: regression — does not affect other workflows", () => {
  it("contractor-dispute workflow still works independently", () => {
    const contractorProfile = workflowProfiles["contractor-dispute"];
    expect(contractorProfile.id).toBe("contractor-dispute");
    expect(contractorProfile.requiredFacts).toContain("contractor name");
    expect(contractorProfile.requiredFacts).not.toContain("debt collector name");
  });

  it("bank-wire-dispute workflow still works independently", () => {
    const bankProfile = workflowProfiles["bank-wire-dispute"];
    expect(bankProfile.id).toBe("bank-wire-dispute");
    expect(bankProfile.requiredFacts).toContain("transaction date");
    expect(bankProfile.requiredFacts).not.toContain("alleged debt amount");
  });

  it("security-deposit-dispute workflow still works independently", () => {
    const depositProfile = workflowProfiles["security-deposit-dispute"];
    expect(depositProfile.id).toBe("security-deposit-dispute");
    expect(depositProfile.family).toBe("Property");
    expect(depositProfile.requiredFacts).not.toContain("original creditor name");
  });

  it("all workflows use the same Gold Standard stages", () => {
    const contractorStages = workflows["contractor-dispute"].goldStandardStages;
    const debtStages = workflows["debt-validation-dispute"].goldStandardStages;
    expect(contractorStages).toEqual(debtStages);
  });

  it("all workflows use the same pipeline archetypes", () => {
    expect(workflows["contractor-dispute"].pipelineArchetypes).toEqual(
      workflows["debt-validation-dispute"].pipelineArchetypes,
    );
  });

  it("debt-validation-dispute has a different family than Property workflows", () => {
    expect(workflowProfiles["contractor-dispute"].family).toBe("Property");
    expect(workflowProfiles["security-deposit-dispute"].family).toBe("Property");
    expect(workflowProfiles["debt-validation-dispute"].family).toBe("Financial");
  });

  it("debt-validation-dispute shares Financial family with bank-wire-dispute", () => {
    expect(workflowProfiles["bank-wire-dispute"].family).toBe("Financial");
    expect(workflowProfiles["debt-validation-dispute"].family).toBe("Financial");
  });
});

