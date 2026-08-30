/**
 * CP2000 Extraction Tests
 *
 * Tests CP2000-specific field extraction, source grounding, and classification.
 */

import { describe, it, expect } from "vitest";
import { extractCP2000, generateCP2000Draft, type CP2000Extraction } from "../cp2000";

// ── Sample CP2000 notice text ────────────────────────────────

const SAMPLE_CP2000 = `
  Internal Revenue Service
  CP2000
  Notice Number: CP2000-2025-12345-A
  Date of notice: January 15, 2025
  Tax Year 2024
  
  We are proposing changes to your tax return.
  
  You reported income of: $45,000
  Income reported to us on Form W-2: $52,000
  Payer: ACME Corporation
  
  Proposed increase in tax: $1,450
  Estimated penalty: $290
  
  If you don't respond by February 14, 2025, we may issue a statutory notice of deficiency.
  
  Send your response to:
  IRS - Department of the Treasury
  P.O. Box 932100
  Louisville, KY 40293-2100
  
  Phone: 800-829-8310
`;

const NON_CP2000 = `
  Internal Revenue Service
  CP14
  Notice Number: CP14-2025-67890-B
  Date: March 1, 2025
  
  You owe $3,847.00 in taxes.
  Please pay by April 15, 2025.
`;

const MISSING_DEADLINE = `
  CP2000
  Notice Number: CP2000-2025-11111-X
  Tax Year 2023
  Proposed increase in tax: $2,100
  You reported income of: $38,000
  Income reported to us: $45,000
`;

// ── Tests ─────────────────────────────────────────────────────

describe("CP2000 Extraction", () => {
  describe("extractCP2000 — happy path", () => {
    const extraction = extractCP2000(SAMPLE_CP2000);

    it("identifies CP2000 notice", () => {
      expect(extraction.isCP2000).toBe(true);
      expect(extraction.classificationConfidence).toBeGreaterThan(0.5);
    });

    it("extracts notice number", () => {
      expect(extraction.noticeNumber).toBeTruthy();
      expect(extraction.noticeNumber).toContain("CP2000");
    });

    it("extracts notice date", () => {
      expect(extraction.noticeDate).toBeTruthy();
      expect(extraction.noticeDate).toContain("January");
    });

    it("extracts response deadline", () => {
      expect(extraction.responseDeadline).toBeTruthy();
      expect(extraction.responseDeadline).toContain("February");
    });

    it("extracts tax year", () => {
      expect(extraction.taxYear).toBe("2024");
    });

    it("extracts proposed tax increase", () => {
      expect(extraction.proposedTaxIncrease).toBeTruthy();
      expect(extraction.proposedTaxIncrease).toContain("1,450");
    });

    it("extracts reported income", () => {
      expect(extraction.reportedIncome).toBeTruthy();
      expect(extraction.reportedIncome).toContain("45,000");
    });

    it("extracts IRS reported income", () => {
      expect(extraction.irsReportedIncome).toBeTruthy();
      expect(extraction.irsReportedIncome).toContain("52,000");
    });

    it("extracts income source", () => {
      expect(extraction.incomeSource).toBeTruthy();
      expect(extraction.incomeSource).toContain("W-2");
    });

    it("extracts response address", () => {
      expect(extraction.responseAddress).toBeTruthy();
      expect(extraction.responseAddress).toContain("P.O. Box");
    });

    it("extracts contact phone", () => {
      expect(extraction.contactPhone).toBeTruthy();
    });

    it("creates structured facts with provenance", () => {
      expect(extraction.facts.length).toBeGreaterThan(5);
      const noticeFact = extraction.facts.find((f) => f.label === "Notice Number");
      expect(noticeFact).toBeDefined();
      expect(noticeFact?.sourceExcerpt).toBeTruthy();
      expect(noticeFact?.extractionMethod).toBe("pattern_match");
      expect(noticeFact?.confidence).toBe("high");
    });
  });

  describe("extractCP2000 — non-CP2000 document", () => {
    const extraction = extractCP2000(NON_CP2000);

    it("does not identify as CP2000", () => {
      expect(extraction.isCP2000).toBe(false);
    });

    it("includes warning about classification", () => {
      expect(extraction.warnings.length).toBeGreaterThan(0);
      const classificationWarning = extraction.warnings.find((w) => w.includes("not") || w.includes("classified"));
      expect(classificationWarning).toBeTruthy();
    });
  });

  describe("extractCP2000 — missing fields", () => {
    const extraction = extractCP2000(MISSING_DEADLINE);

    it("warns about missing deadline", () => {
      const deadlineWarning = extraction.warnings.find((w) => w.toLowerCase().includes("deadline"));
      expect(deadlineWarning).toBeTruthy();
    });

    it("still extracts available fields", () => {
      expect(extraction.noticeNumber).toBeTruthy();
      expect(extraction.taxYear).toBe("2023");
      expect(extraction.proposedTaxIncrease).toBeTruthy();
    });

    it("returns null for missing fields", () => {
      expect(extraction.responseDeadline).toBeNull();
    });
  });

  describe("extractCP2000 — uncertainty handling", () => {
    it("does not manufacture missing values", () => {
      const text = "CP2000\nSome vague text without specific fields.";
      const extraction = extractCP2000(text);

      expect(extraction.noticeNumber).not.toBeNull(); // CP2000 is detected
      expect(extraction.taxYear).toBeNull();
      expect(extraction.proposedTaxIncrease).toBeNull();
      expect(extraction.responseDeadline).toBeNull();
    });

    it("includes warnings for missing critical fields", () => {
      const text = "CP2000\nSome text without fields.";
      const extraction = extractCP2000(text);
      expect(extraction.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe("generateCP2000Draft", () => {
  it("generates a draft with notice number", () => {
    const draft = generateCP2000Draft({
      noticeNumber: "CP2000-2025-12345-A",
      taxYear: "2024",
      noticeDate: "January 15, 2025",
      responseDeadline: "February 14, 2025",
      userFacts: "My W-2 shows $45,000 from ACME Corp.",
      userObjective: "I disagree with the proposed adjustment.",
    });

    expect(draft).toContain("CP2000-2025-12345-A");
    expect(draft).toContain("2024");
    expect(draft).toContain("February 14, 2025");
    expect(draft).toContain("ACME Corp");
    expect(draft).toContain("disagree");
  });

  it("includes placeholders for missing information", () => {
    const draft = generateCP2000Draft({
      noticeNumber: "",
      taxYear: null,
      noticeDate: null,
      responseDeadline: null,
      userFacts: "",
      userObjective: "",
    });

    expect(draft).toContain("[Notice Number]");
    expect(draft).toContain("[Verify on notice]");
    expect(draft).toContain("[Verify deadline");
    expect(draft).toContain("[State what you want");
    expect(draft).toContain("[Explain the income");
  });

  it("produces a professional letter format", () => {
    const draft = generateCP2000Draft({
      noticeNumber: "CP2000-2025-12345-A",
      taxYear: "2024",
      noticeDate: "January 15, 2025",
      responseDeadline: "February 14, 2025",
      userFacts: "Test facts",
      userObjective: "Test objective",
    });

    expect(draft).toContain("Re: CP2000 Notice");
    expect(draft).toContain("Dear Sir or Madam");
    expect(draft).toContain("Sincerely");
  });
});
