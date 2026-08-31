import { describe, expect, it } from "vitest";
import {
  analyzeMatterWorkflowInput,
  canApproveMatter,
  canAuthorizeMatterMail,
  canCompleteMatterProof,
  type MatterAnalysis,
} from "./gold-standard";
import { workflowProfiles } from "./workflow-profiles";

const profile = workflowProfiles["contractor-dispute"];

const completeIntake = {
  propertyAddress: "123 Main Street, Springfield, IL",
  contractorName: "ABC Construction LLC",
  agreementReference: "Written contract dated January 15, 2026",
  disputeDescription: "Defective roofing installation causing water damage",
};

function analyze(input: {
  text?: string;
  facts?: Record<string, string | undefined>;
  objective?: string;
  evidenceStatuses?: Record<string, string>;
}) {
  return analyzeMatterWorkflowInput({
    documentId: "doc-1",
    text: input.text ?? "Contract dated January 15, 2026. Invoice #1234 for $15,000. Work performed February 2026.",
    profile,
    workflowFacts: input.facts ?? completeIntake,
    evidenceStatuses: input.evidenceStatuses as Record<string, "provided" | "missing" | "requested" | "verified" | "rejected" | "not_applicable"> | undefined,
    objective: input.objective ?? "Request repair of defective roofing and refund of overcharged amounts.",
  });
}

describe("matter analysis: fact extraction", () => {
  it("extracts user-provided facts from intake", () => {
    const analysis = analyze({});
    expect(analysis.facts.length).toBeGreaterThan(0);
    const fact = analysis.facts.find((f) => f.label === "propertyAddress");
    expect(fact).toBeDefined();
    expect(fact!.provenance).toBe("user_provided");
  });

  it("confirms all required facts when provided", () => {
    const analysis = analyze({});
    const confirmedFindings = analysis.findings.filter((f) => f.state === "confirmed");
    // Should confirm at least 4 fact findings + objective + source = 6
    expect(confirmedFindings.length).toBeGreaterThanOrEqual(5);
  });

  it("flags missing required facts as blocking issues", () => {
    const analysis = analyze({ facts: { contractorName: "ABC Construction" } });
    const missingFindings = analysis.findings.filter((f) => f.state === "missing");
    expect(missingFindings.length).toBeGreaterThan(0);
    expect(analysis.blockingIssues).toContain("property address is required.");
  });

  it("flags missing objective as a blocking issue", () => {
    const analysis = analyze({ objective: "" });
    expect(analysis.blockingIssues).toContain("A specific requested resolution is required.");
  });

  it("flags missing source document text", () => {
    const analysis = analyze({ text: "" });
    expect(analysis.blockingIssues).toContain("Source document text is required.");
  });
});

describe("matter analysis: evidence", () => {
  it("creates evidence requirements from the profile", () => {
    const analysis = analyze({});
    expect(analysis.evidence.length).toBeGreaterThanOrEqual(profile.evidenceRequirements.length);
  });

  it("flags unprovided evidence as blocking", () => {
    const analysis = analyze({});
    const blockingEvidence = analysis.blockingIssues.filter((issue) =>
      issue.startsWith("Evidence required:"),
    );
    expect(blockingEvidence.length).toBeGreaterThan(0);
  });

  it("does not flag provided evidence as blocking", () => {
    const evidenceStatuses: Record<string, string> = {};
    for (const req of profile.evidenceRequirements) {
      const slug = req.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      evidenceStatuses[`evidence-${slug}`] = "provided";
    }
    const analysis = analyze({ evidenceStatuses });
    const blockingEvidence = analysis.blockingIssues.filter((issue) =>
      issue.startsWith("Evidence required:"),
    );
    expect(blockingEvidence).toHaveLength(0);
  });
});

describe("matter analysis: timeline", () => {
  it("extracts date-like patterns from source text", () => {
    const analysis = analyze({ text: "Contract dated January 15, 2026. Invoice issued 02/10/2026." });
    expect(analysis.timeline.length).toBeGreaterThan(0);
    const dates = analysis.timeline.map((t) => t.date).filter(Boolean);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("produces empty timeline when no dates are present", () => {
    const analysis = analyze({ text: "No dates here at all." });
    expect(analysis.timeline).toHaveLength(0);
  });
});

describe("matter analysis: risk identification", () => {
  it("identifies incomplete intake as a high-severity risk", () => {
    const analysis = analyze({ facts: {} });
    const highRisks = analysis.risks.filter((r) => r.severity === "high");
    expect(highRisks.length).toBeGreaterThan(0);
  });

  it("produces strategy points", () => {
    const analysis = analyze({});
    expect(analysis.strategy.length).toBeGreaterThan(0);
    expect(analysis.strategy.some((s) => s.includes("contractor"))).toBe(true);
  });
});

describe("matter analysis: provenance", () => {
  it("tags user-provided facts with user_provided provenance", () => {
    const analysis = analyze({});
    const userFacts = analysis.facts.filter((f) => f.provenance === "user_provided");
    expect(userFacts.length).toBeGreaterThan(0);
  });
});

describe("approval gates", () => {
  function cleanAnalysis(overrides: Partial<MatterAnalysis> = {}): MatterAnalysis {
    const evidenceStatuses: Record<string, string> = {};
    for (const req of profile.evidenceRequirements) {
      const slug = req.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      evidenceStatuses[`evidence-${slug}`] = "provided";
    }
    return {
      documentId: "doc-1",
      classification: { type: "contractor-dispute", confidence: 0.9 },
      facts: [{ label: "propertyAddress", value: "123 Main St", provenance: "user_provided" as const }],
      findings: [{ id: "confirmed", state: "confirmed", title: "Confirmed", detail: "OK", severity: "low" as const }],
      evidence: profile.evidenceRequirements.map((req, i) => ({
        id: `evidence-${i}`,
        description: req,
        status: "provided" as const,
        supportsFindingIds: [],
      })),
      timeline: [],
      strategy: ["Strategy"],
      blockingIssues: [],
      risks: [],
      ...overrides,
    };
  }

  it("allows approval only when evidence and findings are resolved", () => {
    expect(canApproveMatter(cleanAnalysis())).toBe(true);
    expect(
      canApproveMatter(
        cleanAnalysis({
          evidence: [{ id: "e1", description: "Test", status: "requested", supportsFindingIds: [] }],
        }),
      ),
    ).toBe(false);
    expect(
      canApproveMatter(
        cleanAnalysis({
          findings: [{ id: "f1", state: "requires_verification", title: "Verify", detail: "Needs check", severity: "medium" }],
        }),
      ),
    ).toBe(false);
  });

  it("requires every consequential gate before mail authorization", () => {
    const analysis = cleanAnalysis();
    const baseline = {
      analysis,
      draftValidated: true,
      humanApproved: true,
      recipientComplete: true,
      paymentComplete: true,
    };
    expect(canAuthorizeMatterMail(baseline)).toBe(true);
    expect(canAuthorizeMatterMail({ ...baseline, draftValidated: false })).toBe(false);
    expect(canAuthorizeMatterMail({ ...baseline, humanApproved: false })).toBe(false);
    expect(canAuthorizeMatterMail({ ...baseline, recipientComplete: false })).toBe(false);
    expect(canAuthorizeMatterMail({ ...baseline, paymentComplete: false })).toBe(false);
  });

  it("blocks authorization when analysis has unresolved evidence", () => {
    const analysis = cleanAnalysis({
      evidence: [{ id: "e1", description: "Test", status: "missing", supportsFindingIds: [] }],
    });
    expect(
      canAuthorizeMatterMail({
        analysis,
        draftValidated: true,
        humanApproved: true,
        recipientComplete: true,
        paymentComplete: true,
      }),
    ).toBe(false);
  });

  it("requires tracking number and proof readiness for completion", () => {
    expect(canCompleteMatterProof({ trackingNumber: "TRK-1", proofReady: true })).toBe(true);
    expect(canCompleteMatterProof({ trackingNumber: null, proofReady: true })).toBe(false);
    expect(canCompleteMatterProof({ trackingNumber: "TRK-1", proofReady: false })).toBe(false);
  });
});
