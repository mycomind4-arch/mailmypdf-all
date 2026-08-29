import { describe, expect, it } from "vitest";
import { assertNoOutcomeClaims, canDraftBenefitsAppeal, canValidateBenefitsAppeal, extractBenefitsCase } from "./benefits-contract";

describe("Benefits Appeal contract", () => {
  it("extracts decision issues without deciding eligibility", () => {
    const result = extractBenefitsCase({
      jurisdiction: "Example State",
      decision: {
        id: "decision-1",
        decisionDate: "2026-08-01",
        deadline: "2026-09-01",
        agency: "Example Benefits Agency",
        caseNumber: "ABC-123",
        process: "reconsideration",
        text: "Your claim was denied.\nIncome documentation was incomplete.",
      },
      supportingDocuments: [],
    });

    expect(result.issues).toHaveLength(2);
    expect(result.issues.every((issue) => issue.status === "unmapped")).toBe(true);
  });

  it("requires evidence before drafting", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    expect(canDraftBenefitsAppeal(result)).toBe(false);
    result.issues[0].status = "supported";
    result.issues[0].evidenceIds.push("e1");
    expect(canDraftBenefitsAppeal(result)).toBe(true);
    expect(canValidateBenefitsAppeal(result)).toBe(true);
  });

  it("blocks supported issues without evidence provenance", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    result.issues[0].status = "supported";
    expect(canDraftBenefitsAppeal(result)).toBe(false);
  });

  it("blocks validation when an issue needs an authoritative source", () => {
    const result = extractBenefitsCase({
      decision: { id: "d", text: "Your claim was denied." },
      supportingDocuments: [],
    });
    result.issues[0].status = "needs_authority";
    expect(canDraftBenefitsAppeal(result)).toBe(false);
    expect(canValidateBenefitsAppeal(result)).toBe(false);
  });

  it("rejects unsupported outcome claims", () => {
    expect(() => assertNoOutcomeClaims("You will win this appeal.")).toThrow();
    expect(() => assertNoOutcomeClaims("The decision states that income documentation was incomplete.")).not.toThrow();
  });
});
