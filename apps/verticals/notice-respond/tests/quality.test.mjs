import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  evaluateResponseQuality,

} from "../src/domain/quality.ts";
import { createFact } from "../src/domain/fact.ts";

describe("Response Quality Engine", () => {
  function makeInput(overrides) {
    const fact1 = createFact("Issuing Agency", "IRS", "extracted", "high", { userConfirmed: true });
    const fact2 = createFact("Amount Owed", "$1,234.56", "extracted", "high", { userConfirmed: true });
    return {
      draftContent: `Dear Sir or Madam,
I am writing in response to the notice from IRS.
The amount in question is $1,234.56.
Please find enclosed the supporting documentation.
Sincerely,
[Your Name]`,
      facts: [fact1, fact2],
      evidence: [{ id: "e1", label: "Tax Return 2024" }],
      deadline: { date: "2026-09-15", certainty: "explicit" },
      agency: "IRS",
      referenceNumber: "CP2000-12345",
      noticeDate: "2026-07-15",
      selectedStrategyType: "provide_documentation",
      userObjective: "Explain the discrepancy",
      unresolvedPlaceholders: [{ placeholder: "Your Name", reason: "Add your full name" }],
      ...overrides,
    };
  }

  it("evaluates a complete response", () => {
    const report = evaluateResponseQuality(makeInput({}));
    assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
    assert.ok(report.dimensions.length >= 7);
    assert.ok(report.summary.length > 0);
    assert.equal(report.isHeuristic, true);
  });

  it("scores factual consistency based on fact inclusion", () => {
    const report = evaluateResponseQuality(makeInput({}));
    const factualDim = report.dimensions.find((d) => d.name === "factual_consistency");
    assert.ok(factualDim);
    assert.ok(factualDim.score > 0);
  });

  it("penalizes for unresolved placeholders", () => {
    const withPlaceholders = evaluateResponseQuality(makeInput({
      unresolvedPlaceholders: [
        { placeholder: "Name", reason: "Missing" },
        { placeholder: "Date", reason: "Missing" },
        { placeholder: "Address", reason: "Missing" },
      ],
    }));
    const without = evaluateResponseQuality(makeInput({ unresolvedPlaceholders: [] }));
    assert.ok(withPlaceholders.missingInformationCount === 3);
    assert.ok(withPlaceholders.overallScore < without.overallScore);
  });

  it("does not pass when placeholders remain", () => {
    const report = evaluateResponseQuality(makeInput({
      unresolvedPlaceholders: [{ placeholder: "Name", reason: "Missing" }],
    }));
    assert.equal(report.passed, false);
  });

  it("detects aggressive tone", () => {
    const report = evaluateResponseQuality(makeInput({
      draftContent: "Dear Sir, This is ridiculous and you are incompetent. The IRS is a fraud. Sincerely, [Name]",
    }));
    const toneDim = report.dimensions.find((d) => d.name === "tone");
    assert.ok(toneDim.score < 60);
  });

  it("rewards formal structure", () => {
    const report = evaluateResponseQuality(makeInput({}));
    const formatDim = report.dimensions.find((d) => d.name === "format_validity");
    assert.ok(formatDim.score >= 70);
  });

  it("penalizes missing salutation", () => {
    const report = evaluateResponseQuality(makeInput({
      draftContent: "I am writing about the notice. The amount is $1,234.56. Sincerely, [Name]",
    }));
    const formatDim = report.dimensions.find((d) => d.name === "format_validity");
    assert.ok(formatDim.score < 100);
  });

  it("checks deadline consistency", () => {
    const report = evaluateResponseQuality(makeInput({}));
    const deadlineDim = report.dimensions.find((d) => d.name === "deadline_consistency");
    assert.ok(deadlineDim);
  });

  it("marks all scores as heuristic", () => {
    const report = evaluateResponseQuality(makeInput({}));
    for (const dim of report.dimensions) {
      assert.equal(dim.isHeuristic, true);
    }
    assert.equal(report.isHeuristic, true);
  });

  it("includes summary text mentioning heuristic nature", () => {
    const report = evaluateResponseQuality(makeInput({}));
    assert.match(report.summary, /heuristic/i);
  });
});
