import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";
import { isApprovalValid } from "./draft-provenance";
import { transitionMatter, type PrivateOfficeMatter } from "./matter";

const profile = workflowProfiles["trust-beneficiary-notice"];

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
  trustName: "The Smith Family Trust dated January 15, 2020",
  trusteeName: "John A. Smith",
  beneficiaryName: "Jane B. Smith",
  relevantDate: "June 1, 2026",
  matterDescription:
    "Requested accounting of trust assets and distributions. Trustee has not provided a full accounting despite multiple requests.",
  trusteePosition:
    "Trustee stated accounting would be provided but has not responded in 60 days. No accounting received.",
};

describe("trust-beneficiary-notice: workflow registration", () => {
  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("trust-beneficiary-notice");
  });

  it("has gold standard lifecycle", () => {
    expect(workflows["trust-beneficiary-notice"].lifecycle).toBe("gold");
  });

  it("belongs to the Trust & Estate family", () => {
    expect(profile.family).toBe("Trust & Estate");
  });
});

describe("trust-beneficiary-notice: intake and required facts", () => {
  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust document text.",
      facts: {},
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    const requiredBlocking = result.errors.filter((e) =>
      profile.requiredFacts.some((req) => e.includes(req)),
    );
    expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
  });

  it("blocks when trust name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, trustName: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("trust name"))).toBe(true);
  });

  it("blocks when trustee name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, trusteeName: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("trustee name"))).toBe(true);
  });

  it("blocks when beneficiary name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, beneficiaryName: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("beneficiary name"))).toBe(true);
  });

  it("blocks when relevant date is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, relevantDate: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("relevant date"))).toBe(true);
  });

  it("blocks when matter description is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, matterDescription: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("matter description"))).toBe(true);
  });

  it("blocks when trustee position is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, trusteePosition: "" },
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("trustee position"))).toBe(true);
  });

  it("blocks when objective is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      objective: "",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("resolution"))).toBe(true);
  });
});

describe("trust-beneficiary-notice: privacy and data minimization", () => {
  it("does not require SSN as a required fact", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("social security");
    expect(allFacts).not.toContain("ssn");
  });

  it("does not require passwords or credentials", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("password");
    expect(allFacts).not.toContain("credential");
  });

  it("does not require full bank account numbers", () => {
    const allFacts = profile.requiredFacts.join(" ").toLowerCase();
    expect(allFacts).not.toContain("account number");
  });

  it("workflow accepts facts without sensitive identifiers", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("trust-beneficiary-notice: evidence", () => {
  it("generates evidence requirements from the profile", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      objective: "Request accounting.",
    });
    expect(result.analysis.evidence.length).toBe(
      profile.evidenceRequirements.length,
    );
  });

  it("generates evidence items for missing facts when facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: {},
      objective: "Request accounting.",
    });
    const missingEvidence = result.analysis.evidence.filter(
      (e) => e.status === "missing",
    );
    expect(missingEvidence.length).toBe(profile.requiredFacts.length);
  });

  it("evidence items include trust-specific categories", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      objective: "Request accounting.",
    });
    const evidenceDescriptions = result.analysis.evidence.map((e) => e.description);
    expect(evidenceDescriptions).toContain("trust instrument or trust document");
    expect(evidenceDescriptions).toContain("amendments or restatements");
    expect(evidenceDescriptions).toContain("trustee correspondence");
    expect(evidenceDescriptions).toContain("accounting or financial records");
    expect(evidenceDescriptions).toContain("death certificate when relevant");
  });

  it("blocks when evidence is not provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: {},
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(true);
  });

  it("passes blocking gate when all evidence is provided", () => {
    const evidenceStatuses = buildEvidenceStatuses("provided");
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses,
      objective: "Request accounting.",
    });
    expect(result.blocked).toBe(false);
  });
});

describe("trust-beneficiary-notice: timeline and chronology", () => {
  it("extracts dates from source documents for the timeline", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust created January 15, 2020. Amendment executed March 10, 2022. Trustee letter dated June 1, 2026. Beneficiary request sent June 15, 2026.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.analysis.timeline.length).toBeGreaterThan(0);
    const dates = result.analysis.timeline.map((t) => t.date);
    expect(dates).toContain("January 15, 2020");
    expect(dates).toContain("March 10, 2022");
  });

  it("timeline events include source excerpts for provenance", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trustee letter dated June 1, 2026 states accounting will be provided.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    const timelineEvent = result.analysis.timeline.find(
      (t) => t.date?.includes("June 1, 2026"),
    );
    expect(timelineEvent).toBeDefined();
    expect(timelineEvent?.sourceExcerpt).toBeDefined();
  });

  it("timeline is empty when source has no dates", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust document with no dates mentioned.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.analysis.timeline).toHaveLength(0);
  });
});

describe("trust-beneficiary-notice: analysis and findings", () => {
  it("classifies as trust-beneficiary-notice", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.analysis.classification.type).toBe("trust-beneficiary-notice");
  });

  it("findings include confirmed facts when all required facts are provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    const confirmed = result.analysis.findings.filter(
      (f) => f.state === "confirmed",
    );
    expect(confirmed.length).toBeGreaterThan(0);
  });

  it("findings include missing facts when required facts are absent", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: {},
      objective: "Request accounting.",
    });
    const missing = result.analysis.findings.filter(
      (f) => f.state === "missing",
    );
    expect(missing.length).toBeGreaterThanOrEqual(profile.requiredFacts.length);
  });

  it("risk assessment flags incomplete intake", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: {},
      objective: "",
    });
    expect(result.analysis.risks.length).toBeGreaterThan(0);
    expect(result.analysis.risks[0].severity).toBe("high");
    expect(result.analysis.risks[0].title).toContain("Incomplete intake");
  });

  it("strategy addresses the trustee as recipient", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.analysis.strategy.some((s) => s.includes("trustee"))).toBe(true);
  });
});

describe("trust-beneficiary-notice: legal-conclusion safety", () => {
  it("does not produce findings that declare beneficiary status as verified legal fact", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust document states Jane B. Smith is a beneficiary.",
      facts: { ...completeFacts, beneficiaryStatus: "Named beneficiary in Section 3.2" },
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    const allFindingText = result.analysis.findings
      .map((f) => `${f.title} ${f.detail}`)
      .join(" ")
      .toLowerCase();
    expect(allFindingText).not.toContain("verified as a legal beneficiary");
    expect(allFindingText).not.toContain("legally confirmed beneficiary");
  });

  it("does not produce findings that declare fiduciary breach", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trustee has not responded to accounting requests.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    const allFindingText = result.analysis.findings
      .map((f) => `${f.title} ${f.detail}`)
      .join(" ")
      .toLowerCase();
    expect(allFindingText).not.toContain("fiduciary breach");
    expect(allFindingText).not.toContain("violated fiduciary duty");
    expect(allFindingText).not.toContain("trustee violated");
  });

  it("does not produce findings that guarantee inheritance or distribution", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust document text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request distribution of assets.",
    });
    const allFindingText = result.analysis.findings
      .map((f) => `${f.title} ${f.detail}`)
      .join(" ")
      .toLowerCase();
    expect(allFindingText).not.toContain("guaranteed inheritance");
    expect(allFindingText).not.toContain("guaranteed distribution");
    expect(allFindingText).not.toContain("entitled to distribution");
  });

  it("does not produce findings that interpret trust language as legal conclusion", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust instrument Section 3.2 states the trustee shall distribute income annually.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    const allFindingText = result.analysis.findings
      .map((f) => `${f.title} ${f.detail}`)
      .join(" ")
      .toLowerCase();
    expect(allFindingText).not.toContain("trust legally requires");
    expect(allFindingText).not.toContain("legally means");
  });

  it("risk assessment flags incomplete intake without drawing legal conclusions", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust document names Robert C. Smith as trustee.",
      facts: { ...completeFacts, trusteeName: "John A. Smith" },
      evidenceStatuses: {},
      objective: "Request accounting.",
    });
    const hasRisk = result.analysis.risks.length > 0;
    expect(hasRisk).toBe(true);
    // It must not declare fiduciary breach even when risks are present
    const allRiskText = result.analysis.risks
      .map((r) => `${r.title} ${r.detail}`)
      .join(" ")
      .toLowerCase();
    expect(allRiskText).not.toContain("fiduciary breach");
    expect(allRiskText).not.toContain("trustee violated");
  });
});

describe("trust-beneficiary-notice: draft generation", () => {
  it("generates a draft with the trust beneficiary correspondence subject line", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request a full accounting of trust assets and distributions.",
    });
    expect(result.draft).toContain("Re: Trust Beneficiary Correspondence");
    expect(result.draft).toContain("[DRAFT — REVIEW BEFORE SENDING]");
  });

  it("draft includes user-provided facts", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.draft).toContain("The Smith Family Trust");
    expect(result.draft).toContain("John A. Smith");
    expect(result.draft).toContain("Jane B. Smith");
  });

  it("draft includes the disclaimer", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.draft).toContain("Disclaimer:");
    expect(result.draft).toContain("not a law firm");
  });

  it("draft does not assert legal conclusions about beneficiary status", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: { ...completeFacts, beneficiaryStatus: "Named beneficiary in Section 3.2" },
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.draft).not.toContain("legally confirmed");
    expect(result.draft).not.toContain("legally a beneficiary");
  });

  it("draftHash is null in the result (computed by caller)", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(result.draftHash).toBe(null);
    expect(result.draft.length).toBeGreaterThan(0);
  });
});

describe("trust-beneficiary-notice: approval version integrity", () => {
  it("blocks when approvedDraftHash is null in consequential state", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
      consequential: {
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: true,
        mailingSubmitted: true,
        trackingNumber: "TRK-456",
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

describe("trust-beneficiary-notice: authorization gates", () => {
  it("canAuthorizeMatterMail fails when analysis has blocking issues", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
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
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
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
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
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
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      text: "Trust text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Request accounting.",
    });
    expect(canApproveMatter(result.analysis)).toBe(true);
  });
});

describe("trust-beneficiary-notice: matter lifecycle", () => {
  it("can create and transition a trust-beneficiary-notice matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "trust-beneficiary-notice",
      documentId: "doc-1",
      title: "Trust Beneficiary Notice — Smith Family Trust",
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
    expect(validated.workflowId).toBe("trust-beneficiary-notice");

    const reviewed = transitionMatter(validated, "review");
    expect(reviewed.status).toBe("review");

    const approved = transitionMatter(reviewed, "approved", undefined, {
      draftHash: "hash-xyz",
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedDraftHash).toBe("hash-xyz");
  });

  it("rejects invalid transitions for a trust-beneficiary-notice matter", () => {
    const matter: PrivateOfficeMatter = {
      id: "matter-1",
      ownerId: "user-1",
      workflowId: "trust-beneficiary-notice",
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

describe("trust-beneficiary-notice: regression — does not affect other workflows", () => {
  it("contractor-dispute workflow still works independently", () => {
    const contractorProfile = workflowProfiles["contractor-dispute"];
    expect(contractorProfile.id).toBe("contractor-dispute");
    expect(contractorProfile.requiredFacts).toContain("contractor name");
    expect(contractorProfile.requiredFacts).not.toContain("trust name");
  });

  it("property-insurance-claim workflow still works independently", () => {
    const insuranceProfile = workflowProfiles["property-insurance-claim"];
    expect(insuranceProfile.id).toBe("property-insurance-claim");
    expect(insuranceProfile.requiredFacts).toContain("claim number");
    expect(insuranceProfile.requiredFacts).not.toContain("trust name");
  });

  it("bank-wire-dispute workflow still works independently", () => {
    const bankProfile = workflowProfiles["bank-wire-dispute"];
    expect(bankProfile.id).toBe("bank-wire-dispute");
    expect(bankProfile.requiredFacts).toContain("transaction date");
    expect(bankProfile.requiredFacts).not.toContain("trust name");
  });

  it("all four workflows use the same Gold Standard stages", () => {
    const contractorStages = workflows["contractor-dispute"].goldStandardStages;
    const insuranceStages = workflows["property-insurance-claim"].goldStandardStages;
    const bankStages = workflows["bank-wire-dispute"].goldStandardStages;
    const trustStages = workflows["trust-beneficiary-notice"].goldStandardStages;
    expect(contractorStages).toEqual(insuranceStages);
    expect(insuranceStages).toEqual(bankStages);
    expect(bankStages).toEqual(trustStages);
  });

  it("all four workflows use the same pipeline archetypes", () => {
    expect(workflows["contractor-dispute"].pipelineArchetypes).toEqual(
      workflows["property-insurance-claim"].pipelineArchetypes,
    );
    expect(workflows["property-insurance-claim"].pipelineArchetypes).toEqual(
      workflows["bank-wire-dispute"].pipelineArchetypes,
    );
    expect(workflows["bank-wire-dispute"].pipelineArchetypes).toEqual(
      workflows["trust-beneficiary-notice"].pipelineArchetypes,
    );
  });

  it("trust-beneficiary-notice has a different family than the other workflows", () => {
    expect(workflowProfiles["contractor-dispute"].family).toBe("Property");
    expect(workflowProfiles["property-insurance-claim"].family).toBe("Property");
    expect(workflowProfiles["bank-wire-dispute"].family).toBe("Financial");
    expect(workflowProfiles["trust-beneficiary-notice"].family).toBe("Trust & Estate");
  });
});
