import { describe, it, expect } from "vitest";
import { analyzeCreditReportInput, canApproveDispute } from "../src/domain/gold-standard";

describe("Dispute Mail Gold Standard", () => {
  it("credit report analysis blocks incomplete cases", () => {
    const result = analyzeCreditReportInput({
      documentId: "doc-1",
      text: "TransUnion report dated 2026-08-01",
      bureau: "TransUnion",
    });
    expect(result.findings.some((finding) => finding.id === "facts")).toBe(true);
    expect(canApproveDispute(result)).toBe(false);
  });

  it("credit report analysis remains grounded in supplied facts", () => {
    const result = analyzeCreditReportInput({
      documentId: "doc-2",
      text: "Experian report dated 2026-08-01 shows Account 12345",
      bureau: "Experian",
      accountNumber: "12345",
      reportDate: "2026-08-01",
      errorType: "Not my account",
      facts: "I do not recognize account 12345.",
      objective: "Remove the account after investigation.",
    });
    expect(result.classification.type).toBe("credit-report-dispute");
    expect(result.findings.some((finding) => finding.id === "user-facts-present")).toBe(true);
    expect(result.strategy.length > 0).toBe(true);
    expect(result.blockingIssues.length).toBe(0);
    expect(canApproveDispute(result)).toBe(true);
  });

  it("missing source text is a hard block", () => {
    const result = analyzeCreditReportInput({
      documentId: "doc-3",
      text: "",
      bureau: "Equifax",
      facts: "The balance is wrong.",
      objective: "Correct the balance.",
    });
    expect(canApproveDispute(result)).toBe(false);
    expect(result.blockingIssues.includes("A source document must be available before findings can be grounded.")).toBe(true);
  });
});
