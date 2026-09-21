import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCp2000Notice,
  validateCp2000Draft,
} from "../src/domain-packs/notice-response/index.js";

const notice = {
  isCp2000: true,
  classificationConfidence: 1,
  taxYear: "2024",
  responseDate: "2025-06-01",
  proposedTax: "$2,000",
  proposedPenalty: null,
  proposedIncomeChanges: ["1099-NEC"],
  payerReferences: ["Acme LLC"],
  reportedIncome: "$10,000",
  irsReportedIncome: "$14,000",
  incomeSource: "1099-NEC",
  referenceNumber: "CP2000-123",
  proposedInterest: null,
} as const;

test("blocks fabricated amounts and omitted enclosed evidence", () => {
  const analysis = analyzeCp2000Notice(notice);
  const result = validateCp2000Draft({
    draft: "Dear IRS, Re: CP2000-123. I disagree with the difference for 2024. The amount is $99,999. Sincerely",
    notice,
    analysis,
    includedEvidenceKinds: ["tax_return"],
  });

  assert.equal(result.passed, false);
  assert.ok(result.findings.some((finding) => finding.check === "unsupported_amount:$99,999"));
  assert.ok(result.findings.some((finding) => finding.check === "evidence_listed" && !finding.passed));
  assert.ok(result.findings.some((finding) => finding.check === "unresolved_issues" && !finding.passed));
});

test("passes a grounded draft that identifies the discrepancy and enclosure", () => {
  const analysis = analyzeCp2000Notice({
    ...notice,
    reportedIncome: "$14,000",
    irsReportedIncome: "$14,000",
  });
  const result = validateCp2000Draft({
    draft: "Dear IRS,\nRe: CP2000-123\nI am responding about tax year 2024. The enclosed tax return supports the reported income of $14,000. Please review the enclosed records.\nSincerely",
    notice: { ...notice, reportedIncome: "$14,000", irsReportedIncome: "$14,000" },
    analysis,
    includedEvidenceKinds: ["tax_return"],
    requireRequestedAction: true,
  });

  assert.equal(result.passed, true);
  assert.equal(result.blocks, 0);
});
