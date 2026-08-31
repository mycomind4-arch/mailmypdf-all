import { describe, expect, it } from "vitest";
import { runPrivateOfficeWorkflow } from "./private-office-workflow";
import { workflows } from "./workflows";
import { workflowProfiles } from "./workflow-profiles";
import { canApproveMatter, canAuthorizeMatterMail } from "./gold-standard";

const profile = workflowProfiles["security-deposit-dispute"];

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
  rentalPropertyAddress: "789 Pine Court, Denver, CO 80202",
  landlordOrPropertyManagerName: "Mountain View Properties LLC",
  leaseOrRentalAgreementReference: "Lease dated September 1, 2025, 12-month term",
  depositAmount: "$2,500.00",
  disputeDescription:
    "Landlord retained $1,800 of the $2,500 security deposit for damages that existed at move-in and were documented in the move-in inspection report. No itemized statement was provided within the statutory deadline.",
  landlordResponse:
    "Landlord claims carpet replacement and painting costs but did not provide receipts or an itemized deduction list within 30 days of move-out.",
};

describe("security-deposit-dispute: workflow registration", () => {
  it("is registered in the profile registry", () => {
    expect(profile).toBeDefined();
    expect(profile.id).toBe("security-deposit-dispute");
  });

  it("has gold standard lifecycle", () => {
    expect(workflows["security-deposit-dispute"].lifecycle).toBe("gold");
  });

  it("belongs to the Property family", () => {
    expect(profile.family).toBe("Property");
  });
});

describe("security-deposit-dispute: intake and required facts", () => {
  it("blocks when required facts are missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease document text.",
      facts: {},
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    const requiredBlocking = result.errors.filter((e) =>
      profile.requiredFacts.some((req) => e.includes(req)),
    );
    expect(requiredBlocking.length).toBe(profile.requiredFacts.length);
  });

  it("blocks when rental property address is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, rentalPropertyAddress: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("rental property address"))).toBe(true);
  });

  it("blocks when landlord name is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, landlordOrPropertyManagerName: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("landlord"))).toBe(true);
  });

  it("blocks when lease reference is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, leaseOrRentalAgreementReference: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("lease"))).toBe(true);
  });

  it("blocks when deposit amount is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, depositAmount: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("deposit amount"))).toBe(true);
  });

  it("blocks when dispute description is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, disputeDescription: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("dispute description"))).toBe(true);
  });

  it("blocks when landlord response is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: { ...completeFacts, landlordResponse: "" },
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("landlord response"))).toBe(true);
  });

  it("blocks when objective is missing", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      objective: "",
    });
    expect(result.blocked).toBe(true);
    expect(result.errors.some((e) => e.includes("resolution"))).toBe(true);
  });
});

describe("security-deposit-dispute: privacy and data minimization", () => {
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
});

describe("security-deposit-dispute: evidence", () => {
  it("generates evidence requirements from the profile", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      objective: "Return the full deposit.",
    });
    expect(result.analysis.evidence.length).toBe(
      profile.evidenceRequirements.length,
    );
  });

  it("blocks when evidence is not provided", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: {},
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(true);
  });

  it("passes blocking gate when all evidence is provided", () => {
    const evidenceStatuses = buildEvidenceStatuses("provided");
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses,
      objective: "Return the full deposit.",
    });
    expect(result.blocked).toBe(false);
  });

  it("evidence keys use slugify(requirement) format matching production", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      objective: "Return the full deposit.",
    });

    // Verify evidence IDs match the canonical slugify pattern
    for (const req of profile.evidenceRequirements) {
      const expectedSlug = req
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const expectedId = `evidence-${expectedSlug}`;
      const found = result.analysis.evidence.find((e) => e.id === expectedId);
      expect(found, `Expected evidence item with id ${expectedId} for requirement "${req}"`).toBeDefined();
    }
  });
});

describe("security-deposit-dispute: timeline and chronology", () => {
  it("extracts dates from source documents for the timeline", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease dated September 1, 2025. Move-out June 30, 2026. Landlord response dated August 5, 2026.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    expect(result.analysis.timeline.length).toBeGreaterThan(0);
    const dates = result.analysis.timeline.map((t) => t.date);
    expect(dates).toContain("September 1, 2025");
    expect(dates).toContain("June 30, 2026");
  });

  it("timeline events include source excerpts for provenance", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Landlord response dated August 5, 2026 states carpet replacement needed.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    const timelineEvent = result.analysis.timeline.find(
      (t) => t.date?.includes("August 5"),
    );
    expect(timelineEvent).toBeDefined();
    expect(timelineEvent?.sourceExcerpt).toBeDefined();
  });
});

describe("security-deposit-dispute: draft generation", () => {
  it("generates a draft with the correct subject line", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    expect(result.draft).toContain("Re: Security Deposit Dispute Correspondence");
  });

  it("generates a draft with a disclaimer", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    expect(result.draft).toContain("Disclaimer:");
    expect(result.draft).toContain("not a law firm");
  });

  it("draft addresses the landlord as recipient", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    expect(result.draft).toContain("Landlord");
  });
});

describe("security-deposit-dispute: authorization gates", () => {
  it("canApproveMatter passes when all blocking issues resolved", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
    });
    expect(canApproveMatter(result.analysis)).toBe(true);
  });

  it("canAuthorizeMatterMail fails without all gates satisfied", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
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

  it("canAuthorizeMatterMail fails without payment", () => {
    const result = runPrivateOfficeWorkflow({
      workflowId: "security-deposit-dispute",
      documentId: "doc-1",
      text: "Lease text.",
      facts: completeFacts,
      evidenceStatuses: buildEvidenceStatuses(),
      objective: "Return the full deposit.",
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
});

describe("security-deposit-dispute: deadline policy honesty", () => {
  it("deadline policy does not invent statutory deadlines", () => {
    expect(profile.deadlinePolicy).toContain("Do not invent");
  });

  it("deadline policy distinguishes known from potential deadlines", () => {
    expect(profile.deadlinePolicy).toContain("known deadlines");
    expect(profile.deadlinePolicy).toContain("potential deadlines");
  });
});

describe("security-deposit-dispute: legal-conclusion safety", () => {
  it("does not claim to determine the lawful amount of a deposit", () => {
    // The disclaimer correctly states that Private Office does NOT determine the lawful amount
    expect(profile.disclaimer).toContain("determine the lawful amount of a deposit");
    expect(profile.disclaimer).toContain("not a law firm");
  });

  it("does not claim to interpret lease provisions as legal conclusions", () => {
    expect(profile.disclaimer).toContain("interpret lease provisions as legal conclusions");
  });

  it("does not claim to guarantee deposit return", () => {
    expect(profile.disclaimer).toContain("guarantee");
    expect(profile.disclaimer).toContain("deposit return");
  });
});
