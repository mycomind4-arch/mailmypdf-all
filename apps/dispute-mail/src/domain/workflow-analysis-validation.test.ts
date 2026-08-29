import { describe, expect, it } from "vitest";
import { validateWorkflowAnalysisCoverage } from "./workflow-analysis-validation";

describe("validateWorkflowAnalysisCoverage", () => {
  it("rejects workflow/document identity mismatches", () => {
    const errors = validateWorkflowAnalysisCoverage({ workflowId: "credit-report", documentId: "doc-1", analysis: {
      documentId: "doc-2", classification: { type: "debt-validation", confidence: 1 }, facts: [], findings: [], evidence: [], strategy: [], blockingIssues: [],
    } });
    expect(errors).toContain("Analysis documentId does not match the supplied documentId");
    expect(errors).toContain("Analysis classification type does not match the workflow ID");
  });

  it("rejects omitted required evidence", () => {
    const errors = validateWorkflowAnalysisCoverage({ workflowId: "credit-report", documentId: "doc-1", analysis: {
      documentId: "doc-1", classification: { type: "credit-report", confidence: 1 },
      facts: [
        { label: "credit_bureau", value: "Equifax" },
        { label: "account_reference", value: "ABC123" },
        { label: "reporting_error", value: "Incorrect" },
        { label: "requested_correction", value: "Correct it" },
      ], findings: [], evidence: [], strategy: ["Investigate"], blockingIssues: [],
    } });
    expect(errors.some((error) => error.startsWith("Analysis omitted required evidence item:"))).toBe(true);
  });

  it("accepts a complete covered analysis", () => {
    const errors = validateWorkflowAnalysisCoverage({ workflowId: "credit-report", documentId: "doc-1", analysis: {
      documentId: "doc-1", classification: { type: "credit-report", confidence: 1 },
      facts: [
        { label: "credit_bureau", value: "Equifax" },
        { label: "account_reference", value: "ABC123" },
        { label: "reporting_error", value: "Incorrect" },
        { label: "requested_correction", value: "Correct it" },
      ], findings: [], evidence: [
        { id: "evidence-credit-report-page-or-excerpt", description: "Credit report page or excerpt", status: "verified", supportsFindingIds: [] },
        { id: "evidence-identity-address-support-when-relevant", description: "Identity/address support when relevant", status: "verified", supportsFindingIds: [] },
        { id: "evidence-documents-establishing-the-correct-information", description: "Documents establishing the correct information", status: "verified", supportsFindingIds: [] },
      ], strategy: ["Investigate"], blockingIssues: [],
    } });
    expect(errors).toEqual([]);
  });
});
