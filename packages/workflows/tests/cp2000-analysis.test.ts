import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeCp2000Notice } from "../src/domain-packs/notice-response/cp2000-analysis.js";

describe("CP2000 discrepancy analysis", () => {
  it("flags an income mismatch without deciding which amount is correct", () => {
    const result = analyzeCp2000Notice({
      isCp2000: true,
      classificationConfidence: 0.98,
      taxYear: "2024",
      responseDate: "2026-10-15",
      proposedTax: "$2,400",
      proposedPenalty: "$120",
      proposedIncomeChanges: ["Form 1099-NEC: $18,000"],
      payerReferences: ["Example Payer"],
      reportedIncome: "$12,000",
      irsReportedIncome: "$18,000",
      incomeSource: "Form 1099-NEC",
    });

    assert.equal(result.discrepancies.length, 1);
    assert.equal(result.discrepancies[0]?.type, "amount_mismatch");
    assert.equal(result.discrepancies[0]?.status, "unresolved");
    assert.equal(result.findings[0]?.type, "income_mismatch");
    assert.deepEqual(result.findings[0]?.sourceReferences, ["irs.cp2000-series", "irs.topic-652"]);
    assert.match(result.findings[0]?.recommendedAction ?? "", /Verify/);
  });

  it("preserves safety findings when required notice facts are missing", () => {
    const result = analyzeCp2000Notice({
      isCp2000: false,
      classificationConfidence: 0.31,
      taxYear: "2999",
      responseDate: null,
      proposedTax: "$800",
      proposedPenalty: null,
      proposedIncomeChanges: [],
      payerReferences: [],
      reportedIncome: null,
      irsReportedIncome: "$4,000",
      warnings: ["The response address was not found."],
    });

    assert.deepEqual(result.discrepancies.map((item) => item.type), [
      "documentation_gap",
      "wrong_tax_year",
    ]);
    assert.deepEqual(result.findings.map((finding) => finding.type), [
      "documentation_gap",
      "wrong_tax_year",
      "deadline_risk",
      "proposed_change",
      "classification_warning",
      "missing_info",
    ]);
    assert.equal(result.unresolvedCount, 1);
  });

  it("does not create a mismatch for equal or unparsable amounts", () => {
    const equalInput = {
      isCp2000: true,
      classificationConfidence: 0.9,
      taxYear: "2024",
      responseDate: "2026-10-15",
      proposedTax: null,
      proposedPenalty: null,
      proposedIncomeChanges: [],
      payerReferences: [],
      reportedIncome: "$1,000",
      irsReportedIncome: "$1,000",
    } as const;
    const equal = analyzeCp2000Notice(equalInput);
    const unparsable = analyzeCp2000Notice({
      ...equalInput,
      reportedIncome: "not stated",
      irsReportedIncome: "not stated",
    });

    assert.equal(equal.discrepancies.length, 0);
    assert.equal(unparsable.discrepancies.length, 0);
  });
});
