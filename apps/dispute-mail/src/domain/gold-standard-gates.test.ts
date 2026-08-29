import { describe, expect, it } from "vitest";
import { canApproveDispute, canSubmitDispute, type DisputeAnalysis } from "./gold-standard";

const cleanAnalysis = (overrides: Partial<DisputeAnalysis> = {}): DisputeAnalysis => ({
  documentId: "doc-1",
  classification: { type: "credit-report-dispute", confidence: 0.99 },
  facts: [{ label: "credit_bureau", value: "Experian" }],
  findings: [{ id: "verified-fact", state: "confirmed", title: "Confirmed fact", detail: "Grounded fact", severity: "low" }],
  evidence: [{ id: "evidence-1", description: "Credit report", status: "verified", supportsFindingIds: ["verified-fact"] }],
  strategy: ["Request correction"],
  blockingIssues: [],
  ...overrides,
});

describe("dispute gold-standard gates", () => {
  it("allows approval only when evidence and findings are resolved", () => {
    expect(canApproveDispute(cleanAnalysis())).toBe(true);
    expect(canApproveDispute(cleanAnalysis({
      evidence: [{ id: "e1", description: "Report", status: "requested", supportsFindingIds: [] }],
    }))).toBe(false);
    expect(canApproveDispute(cleanAnalysis({
      findings: [{ id: "f1", state: "requires_verification", title: "Verify", detail: "Needs source check", severity: "medium" }],
    }))).toBe(false);
  });

  it("requires every consequential gate before submission", () => {
    const analysis = cleanAnalysis();
    const baseline = { analysis, draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: true, paymentComplete: true };
    expect(canSubmitDispute(baseline)).toBe(true);
    expect(canSubmitDispute({ ...baseline, draftValidated: false })).toBe(false);
    expect(canSubmitDispute({ ...baseline, humanApproved: false })).toBe(false);
    expect(canSubmitDispute({ ...baseline, recipientComplete: false })).toBe(false);
    expect(canSubmitDispute({ ...baseline, proofReady: false })).toBe(false);
  });
});

describe("dispute submission regression: invalid analysis cannot reach mailing", () => {
  it("blocks submission when evidence is unresolved even if all other gates pass", () => {
    const analysis = cleanAnalysis({
      evidence: [{ id: "e1", description: "Report", status: "requested", supportsFindingIds: [] }],
    });
    const baseline = { analysis, draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: true, paymentComplete: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when findings are unresolved even if all other gates pass", () => {
    const analysis = cleanAnalysis({
      findings: [{ id: "f1", state: "ambiguous", title: "Ambiguous", detail: "Needs resolution", severity: "medium" }],
    });
    const baseline = { analysis, draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: true, paymentComplete: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when blocking issues exist even if all other gates pass", () => {
    const analysis = cleanAnalysis({ blockingIssues: ["Missing deadline"] });
    const baseline = { analysis, draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: true, paymentComplete: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when draft is not validated even with clean analysis", () => {
    const baseline = { analysis: cleanAnalysis(), draftValidated: false, humanApproved: true, recipientComplete: true, proofReady: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when human approval is missing even with clean analysis", () => {
    const baseline = { analysis: cleanAnalysis(), draftValidated: true, humanApproved: false, recipientComplete: true, proofReady: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when recipient is incomplete even with clean analysis", () => {
    const baseline = { analysis: cleanAnalysis(), draftValidated: true, humanApproved: true, recipientComplete: false, proofReady: true };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("blocks submission when proof is not ready even with clean analysis", () => {
    const baseline = { analysis: cleanAnalysis(), draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: false };
    expect(canSubmitDispute(baseline)).toBe(false);
  });

  it("only passes when ALL gates are satisfied simultaneously", () => {
    const baseline = { analysis: cleanAnalysis(), draftValidated: true, humanApproved: true, recipientComplete: true, proofReady: true, paymentComplete: true };
    expect(canSubmitDispute(baseline)).toBe(true);
  });
});
