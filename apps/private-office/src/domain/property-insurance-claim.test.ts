import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { isApprovalValid } from "./draft-provenance";
import { transitionMatter, type PrivateOfficeMatter } from "./matter";

const profile = workflowProfiles["property-insurance-claim"];

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
  propertyAddress: "123 Main Street, Springfield, IL 62701",
  insurerName: "ABC Insurance Company",
  claimNumber: "CLM-2026-001234",
  dateOfLoss: "March 15, 2026",
  descriptionOfDamage: "Wind damage to roof, water intrusion, damaged drywall in two rooms",
  insurerPosition: "Claim denied citing wear and tear exclusion",
};

describe("property-insurance-claim: workflow registration", () => {
  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("property-insurance-claim");
  });

  it("has gold standard lifecycle", () => {
    expect(workflows["property-insurance-claim"].lifecycle).toBe("gold");
  });
});

describe("property-insurance-claim: intake and required facts", () => {
  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy document text.",
      facts: {},
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    const requiredBlocking = result.errors.filter((e) =>
      profile.requiredFacts.some((req) => e.includes(req)),
    );
    expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
  });

  it("blocks when insurer name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: { ...completeFacts, insurerName: "" },
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("insurer name"))).toBe(true);
  });

  it("blocks when claim number is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: { ...completeFacts, claimNumber: "" },
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("claim number"))).toBe(true);
  });

  it("blocks when date of loss is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: { ...completeFacts, dateOfLoss: "" },
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("date of loss"))).toBe(true);
  });

  it("blocks when description of damage is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: { ...completeFacts, descriptionOfDamage: "" },
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("description of damage"))).toBe(true);
  });

  it("blocks when insurer position is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: { ...completeFacts, insurerPosition: "" },
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("insurer position"))).toBe(true);
  });

  it("blocks when objective is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      objective: "",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("resolution"))).toBe(true);
  });
});

describe("property-insurance-claim: evidence", () => {
  it("generates evidence requirements from the profile", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      objective: "Request reconsideration.",
    });
    // When all required facts are provided, only the evidence-requirement items are added
    // (evidence items for missing facts are not generated since all facts are present)
    expect(result.analysis.evidence.length).toBe(
      profile.evidenceRequirements.length,
    );
  });

  it("generates evidence items for missing facts when facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: {},
      objective: "Request reconsideration.",
    });
    // Each missing required fact generates a "missing" evidence item
    // plus the evidence-requirement items
    const missingEvidence = result.analysis.evidence.filter(
      (e) => e.status === "missing",
    );
    expect(missingEvidence.length).toBe(profile.requiredFacts.length);
  });

  it("evidence items have correct IDs derived from requirement names", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      objective: "Request reconsideration.",
    });
    const evidenceDescriptions = result.analysis.evidence.map((e) => e.description);
    expect(evidenceDescriptions).toContain("policy documents or declarations page");
    expect(evidenceDescriptions).toContain("denial letter or explanation of benefits");
    expect(evidenceDescriptions).toContain("photographs of property damage");
  });

  it("blocks when evidence is not provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: {},
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(true);
  });

  it("passes blocking gate when all evidence is provided", () => {
    const evidenceStatuses = buildEvidenceStatuses("provided");
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses,
      objective: "Request reconsideration.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("property-insurance-claim: timeline and chronology", () => {
  it("extracts dates from source documents for the timeline", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Date of loss: March 15, 2026. Claim reported: March 16, 2026. Denial letter dated April 2, 2026.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.analysis.timeline.length).toBeGreaterThan(0);
    const dates = result.analysis.timeline.map((t) => t.date);
    expect(dates).toContain("March 15, 2026");
  });

  it("timeline events include source excerpts for provenance", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Denial letter dated April 2, 2026 states claim is denied.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    const timelineEvent = result.analysis.timeline.find(
      (t) => t.date?.includes("April 2"),
    );
    expect(timelineEvent).toBeDefined();
    expect(timelineEvent?.sourceExcerpt).toBeDefined();
  });

  it("timeline is empty when source has no dates", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy document with no dates.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.analysis.timeline).toHaveLength(0);
  });
});

describe("property-insurance-claim: analysis and findings", () => {
  it("classifies as property-insurance-claim", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.analysis.classification.type).toBe("property-insurance-claim");
  });

  it("findings include confirmed facts when all required facts are provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    const confirmed = result.analysis.findings.filter(
      (f) => f.state === "confirmed",
    );
    expect(confirmed.length).toBeGreaterThan(0);
  });

  it("findings include missing facts when required facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: {},
      objective: "Request reconsideration.",
    });
    const missing = result.analysis.findings.filter(
      (f) => f.state === "missing",
    );
    expect(missing.length).toBeGreaterThanOrEqual(profile.requiredFacts.length);
  });

  it("risk assessment flags incomplete intake", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: {},
      objective: "",
    });
    expect(result.analysis.risks.length).toBeGreaterThan(0);
    expect(result.analysis.risks[0].severity).toBe("high");
    expect(result.analysis.risks[0].title).toContain("Incomplete intake");
  });

  it("strategy addresses the insurer as recipient", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.analysis.strategy.some((s) => s.includes("insurer"))).toBe(true);
  });
});

describe("property-insurance-claim: draft generation", () => {
  it("generates a draft with the insurance claim subject line", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration of the denial.",
    });
    expect(result.draft).toContain("Re: Property Insurance Claim Correspondence");
    expect(result.draft).toContain("[DRAFT — REVIEW BEFORE SENDING]");
  });

  it("draft includes user-provided facts", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.draft).toContain("123 Main Street");
    expect(result.draft).toContain("ABC Insurance Company");
    expect(result.draft).toContain("CLM-2026-001234");
  });

  it("draft includes the disclaimer", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.draft).toContain("Disclaimer:");
    expect(result.draft).toContain("not a law firm");
  });

  it("draftHash is null in the result (computed by caller)", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(result.draftHash).toBe(null);
    expect(result.draft.length).toBeGreaterThan(0);
  });
});

describe("property-insurance-claim: approval version integrity", () => {
  it("blocks when approvedDraftHash is null in consequential state", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
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

describe("property-insurance-claim: authorization gates", () => {
  it("canAuthorizeMatterMail fails when analysis has blocking issues", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
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
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
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
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
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
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      text: "Policy text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request reconsideration.",
    });
    expect(canApproveMatter(result.analysis)).toBe(true);
  });
});

describe("property-insurance-claim: matter lifecycle", () => {
  it("can create and transition a property-insurance-claim matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "property-insurance-claim",
      documentId: "doc-1",
      title: "Property Insurance Claim — ABC Insurance",
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
    expect(validated.workflowId).toBe("property-insurance-claim");

    const reviewed = transitionMatter(validated, "review");
    expect(reviewed.status).toBe("review");

    const approved = transitionMatter(reviewed, "approved", undefined, {
      draftHash: "hash-abc",
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedDraftHash).toBe("hash-abc");
  });

  it("rejects invalid transitions for a property-insurance-claim matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "property-insurance-claim",
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

describe("property-insurance-claim: regression — does not affect contractor-dispute", () => {
  it("contractor-dispute workflow still works independently", () => {
    const contractorProfile = workflowProfiles["contractor-dispute"];
    expect(contractorProfile.id).toBe("contractor-dispute");
    expect(contractorProfile.requiredFacts).toContain("contractor name");
    expect(contractorProfile.requiredFacts).not.toContain("claim number");
  });

  it("both workflows use the same Gold Standard stages", () => {
    const contractorStages = workflows["contractor-dispute"].goldStandardStages;
    const insuranceStages = workflows["property-insurance-claim"].goldStandardStages;
    expect(contractorStages).toEqual(insuranceStages);
  });

  it("both workflows use the same pipeline archetypes", () => {
    expect(workflows["contractor-dispute"].pipelineArchetypes).toEqual(
      workflows["property-insurance-claim"].pipelineArchetypes,
    );
  });
});
