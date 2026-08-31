import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { isApprovalValid } from "./draft-provenance";
import { transitionMatter, type PrivateOfficeMatter } from "./matter";

const profile = workflowProfiles["bank-wire-dispute"];

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
  financialInstitution: "First National Bank",
  accountHolderName: "Jane Q. Public",
  transactionDate: "March 10, 2026",
  transactionAmount: "$25,000.00 USD",
  disputeDescription:
    "Unauthorized wire transfer initiated from account. Account holder did not authorize this transaction.",
  bankResponse:
    "Bank denied recall request citing completed wire. Investigation opened but no update in 30 days.",
};

describe("bank-wire-dispute: workflow registration", () => {
  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("bank-wire-dispute");
  });

  it("has gold standard lifecycle", () => {
    expect(workflows["bank-wire-dispute"].lifecycle).toBe("gold");
  });

  it("belongs to the Financial family", () => {
    expect(profile.family).toBe("Financial");
  });
});

describe("bank-wire-dispute: intake and required facts", () => {
  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank statement text.",
      facts: {},
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    const requiredBlocking = result.errors.filter((e) =>
      profile.requiredFacts.some((req) => e.includes(req)),
    );
    expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
  });

  it("blocks when financial institution is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, financialInstitution: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("financial institution"))).toBe(true);
  });

  it("blocks when account holder name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, accountHolderName: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("account holder name"))).toBe(true);
  });

  it("blocks when transaction date is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, transactionDate: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("transaction date"))).toBe(true);
  });

  it("blocks when transaction amount is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, transactionAmount: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("transaction amount"))).toBe(true);
  });

  it("blocks when dispute description is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, disputeDescription: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("dispute description"))).toBe(true);
  });

  it("blocks when bank response is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: { ...completeFacts, bankResponse: "" },
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("bank response"))).toBe(true);
  });

  it("blocks when objective is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      objective: "",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("resolution"))).toBe(true);
  });
});

describe("bank-wire-dispute: privacy and data minimization", () => {
  it("does not require full account numbers as a required fact", () => {
    expect(profile.requiredFacts).not.toContain("account number");
    expect(profile.requiredFacts).not.toContain("full account number");
  });

  it("does not require passwords or PINs", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("password");
    expect(allFacts).not.toContain("pin");
    expect(allFacts).not.toContain("credential");
  });

  it("workflow accepts masked account references without requiring full numbers", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: {
        ...completeFacts,
        accountReference: "Account ending 4821",
      },
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("bank-wire-dispute: evidence", () => {
  it("generates evidence requirements from the profile", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      objective: "Request investigation.",
    });
    expect(result.analysis.evidence.length).toBe(
      profile.evidenceRequirements.length,
    );
  });

  it("generates evidence items for missing facts when facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: {},
      objective: "Request investigation.",
    });
    const missingEvidence = result.analysis.evidence.filter(
      (e) => e.status === "missing",
    );
    expect(missingEvidence.length).toBe(profile.requiredFacts.length);
  });

  it("evidence items have correct descriptions from requirement names", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      objective: "Request investigation.",
    });
    const evidenceDescriptions = result.analysis.evidence.map((e) => e.description);
    expect(evidenceDescriptions).toContain("bank statement showing the transaction");
    expect(evidenceDescriptions).toContain("wire transfer confirmation or receipt");
    expect(evidenceDescriptions).toContain("bank correspondence regarding the dispute");
  });

  it("blocks when evidence is not provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: {},
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(true);
  });

  it("passes blocking gate when all evidence is provided", () => {
    const evidenceStatuses = buildEvidenceStatuses("provided");
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses,
      objective: "Request investigation.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("bank-wire-dispute: timeline and chronology", () => {
  it("extracts dates from source documents for the timeline", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Wire initiated March 10, 2026. Discovered March 12, 2026. Bank notified March 13, 2026. Bank response dated April 15, 2026.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.analysis.timeline.length).toBeGreaterThan(0);
    const dates = result.analysis.timeline.map((t) => t.date);
    expect(dates).toContain("March 10, 2026");
    expect(dates).toContain("March 12, 2026");
  });

  it("timeline events include source excerpts for provenance", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank response dated April 15, 2026 states claim denied.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    const timelineEvent = result.analysis.timeline.find(
      (t) => t.date?.includes("April 15"),
    );
    expect(timelineEvent).toBeDefined();
    expect(timelineEvent?.sourceExcerpt).toBeDefined();
  });

  it("timeline is empty when source has no dates", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank statement with no dates.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.analysis.timeline).toHaveLength(0);
  });
});

describe("bank-wire-dispute: analysis and findings", () => {
  it("classifies as bank-wire-dispute", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.analysis.classification.type).toBe("bank-wire-dispute");
  });

  it("findings include confirmed facts when all required facts are provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    const confirmed = result.analysis.findings.filter(
      (f) => f.state === "confirmed",
    );
    expect(confirmed.length).toBeGreaterThan(0);
  });

  it("findings include missing facts when required facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: {},
      objective: "Request investigation.",
    });
    const missing = result.analysis.findings.filter(
      (f) => f.state === "missing",
    );
    expect(missing.length).toBeGreaterThanOrEqual(profile.requiredFacts.length);
  });

  it("risk assessment flags incomplete intake", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: {},
      objective: "",
    });
    expect(result.analysis.risks.length).toBeGreaterThan(0);
    expect(result.analysis.risks[0].severity).toBe("high");
    expect(result.analysis.risks[0].title).toContain("Incomplete intake");
  });

  it("strategy addresses the bank as recipient", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.analysis.strategy.some((s) => s.includes("bank"))).toBe(true);
  });
});

describe("bank-wire-dispute: draft generation", () => {
  it("generates a draft with the bank wire dispute subject line", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation and recall of the unauthorized wire.",
    });
    expect(result.draft).toContain("Re: Bank and Wire Transfer Dispute Correspondence");
    expect(result.draft).toContain("[DRAFT — REVIEW BEFORE SENDING]");
  });

  it("draft includes user-provided facts", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.draft).toContain("First National Bank");
    expect(result.draft).toContain("Jane Q. Public");
    expect(result.draft).toContain("$25,000.00");
  });

  it("draft includes the disclaimer", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.draft).toContain("Disclaimer:");
    expect(result.draft).toContain("not a law firm");
  });

  it("draftHash is null in the result (computed by caller)", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(result.draftHash).toBe(null);
    expect(result.draft.length).toBeGreaterThan(0);
  });
});

describe("bank-wire-dispute: approval version integrity", () => {
  it("blocks when approvedDraftHash is null in consequential state", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
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

  it("isApprovalValid rejects when draft was modified after approval", () => {
    expect(isApprovalValid("new-hash", "approved-hash")).toBe(false);
  });

  it("isApprovalValid accepts when hashes match", () => {
    expect(isApprovalValid("same-hash", "same-hash")).toBe(true);
  });

  it("isApprovalValid rejects null hashes", () => {
    expect(isApprovalValid(null, "hash")).toBe(false);
    expect(isApprovalValid("hash", null)).toBe(false);
    expect(isApprovalValid(null, null)).toBe(false);
  });
});

describe("bank-wire-dispute: authorization gates", () => {
  it("canAuthorizeMatterMail fails when analysis has blocking issues", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: {},
      objective: "",
    });
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("canAuthorizeMatterMail fails when human approval is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: false,
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("canAuthorizeMatterMail fails when payment is not complete", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(
      canAuthorizeMatterMail({
        analysis: result.analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: false,
      }),
    ).toBe(false);
  });

  it("canApproveMatter passes when all blocking issues resolved and evidence provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      text: "Bank text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request investigation.",
    });
    expect(canApproveMatter(result.analysis)).toBe(true);
  });
});

describe("bank-wire-dispute: matter lifecycle", () => {
  it("can create and transition a bank-wire-dispute matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      title: "Bank & Wire Transfer Dispute — First National Bank",
      status: "draft",
      version: 1,
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
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
    expect(validated.workflowId).toBe("bank-wire-dispute");

    const reviewed = transitionMatter(validated, "review");
    expect(reviewed.status).toBe("review");

    const approved = transitionMatter(reviewed, "approved", undefined, {
      draftHash: "hash-abc",
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedDraftHash).toBe("hash-abc");
  });

  it("rejects invalid transitions for a bank-wire-dispute matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "bank-wire-dispute",
      documentId: "doc-1",
      title: "Test",
      status: "completed",
      version: 1,
      createdAt: "2026-08-23T00:00:00.000Z",
      updatedAt: "2026-08-23T00:00:00.000Z",
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

describe("bank-wire-dispute: regression — does not affect other workflows", () => {
  it("contractor-dispute workflow still works independently", () => {
    const contractorProfile = workflowProfiles["contractor-dispute"];
    expect(contractorProfile.id).toBe("contractor-dispute");
    expect(contractorProfile.requiredFacts).toContain("contractor name");
    expect(contractorProfile.requiredFacts).not.toContain("transaction date");
  });

  it("property-insurance-claim workflow still works independently", () => {
    const insuranceProfile = workflowProfiles["property-insurance-claim"];
    expect(insuranceProfile.id).toBe("property-insurance-claim");
    expect(insuranceProfile.requiredFacts).toContain("claim number");
    expect(insuranceProfile.requiredFacts).not.toContain("transaction date");
  });

  it("all three workflows use the same Gold Standard stages", () => {
    const contractorStages = workflows["contractor-dispute"].goldStandardStages;
    const insuranceStages = workflows["property-insurance-claim"].goldStandardStages;
    const bankStages = workflows["bank-wire-dispute"].goldStandardStages;
    expect(contractorStages).toEqual(insuranceStages);
    expect(insuranceStages).toEqual(bankStages);
  });

  it("all three workflows use the same pipeline archetypes", () => {
    expect(workflows["contractor-dispute"].pipelineArchetypes).toEqual(
      workflows["property-insurance-claim"].pipelineArchetypes,
    );
    expect(workflows["property-insurance-claim"].pipelineArchetypes).toEqual(
      workflows["bank-wire-dispute"].pipelineArchetypes,
    );
  });

  it("bank-wire-dispute has a different family than the other workflows", () => {
    expect(workflowProfiles["contractor-dispute"].family).toBe("Property");
    expect(workflowProfiles["property-insurance-claim"].family).toBe("Property");
    expect(workflowProfiles["bank-wire-dispute"].family).toBe("Financial");
  });
});
