/* ═══════════════════════════════════════════════════════════
   CP2000 DISCREPANCY ANALYSIS — the gold-standard feature.

   Structured detection of discrepancies between what the IRS
   reports and what the user's records show.

   DISCREPANCY TYPES:
   - amount_mismatch: IRS amount differs from user-reported
   - duplicate_income: Same income counted twice
   - wrong_tax_year: Income attributed to wrong year
   - already_reported: Income was already on the return
   - non_taxable: Item is not taxable
   - identity_mismatch: Payer name doesn't match
   - documentation_gap: No documentation to support position

   The system NEVER tells the user they are "right" unless
   the available evidence supports that conclusion.

   ═══════════════════════════════════════════════════════════ */

import type { CP2000Extraction } from "./cp2000";
import type { NoticeFact } from "./fact";
import { createFinding, type Finding } from "./cp2000-findings";

// ── Discrepancy Types ────────────────────────────────────────

export type DiscrepancyType =
  | "amount_mismatch"
  | "duplicate_income"
  | "wrong_tax_year"
  | "already_reported"
  | "non_taxable"
  | "identity_mismatch"
  | "documentation_gap";

export type DiscrepancyStatus = "unresolved" | "user_correct" | "irs_correct" | "unclear";

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  description: string;
  irsAmount: string | null;
  userAmount: string | null;
  difference: string | null;
  possibleExplanations: string[];
  evidenceNeeded: string[];
  confidence: "high" | "medium" | "low";
  status: DiscrepancyStatus;
  findingId: string;
}

// ── Parse dollar amounts ──────────────────────────────────────

function parseAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\$?([\d,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
}

function formatDifference(a: number | null, b: number | null): string | null {
  if (a === null || b === null) return null;
  const diff = Math.abs(a - b);
  if (diff === 0) return null;
  return `$${diff.toLocaleString()}`;
}

// ── Main Discrepancy Analysis ────────────────────────────────

export interface DiscrepancyInput {
  extraction: CP2000Extraction;
  userFacts?: string;
  userObjective?: string;
}

export interface DiscrepancyResult {
  discrepancies: Discrepancy[];
  findings: Finding[];
  unresolvedCount: number;
  totalIssues: number;
}

export function analyzeCP2000Discrepancies(input: DiscrepancyInput): DiscrepancyResult {
  const { extraction } = input;
  const discrepancies: Discrepancy[] = [];
  const findings: Finding[] = [];

  // ── Amount Mismatch Detection ──
  const reportedAmount = extraction.reportedIncome;
  const irsAmount = extraction.irsReportedIncome;

  if (reportedAmount && irsAmount) {
    const reportedNum = parseAmount(reportedAmount);
    const irsNum = parseAmount(irsAmount);

    if (reportedNum !== null && irsNum !== null && reportedNum !== irsNum) {
      const diff = formatDifference(reportedNum, irsNum);
      const irsHigher = irsNum > reportedNum;

      const finding = createFinding({
        type: "income_mismatch",
        severity: irsHigher && diff ? (irsNum - reportedNum > 5000 ? "critical" : "high") : "medium",
        statement: `The IRS reports ${irsAmount} in income from ${extraction.incomeSource ?? "a third party"}, but your return reports ${reportedAmount}. The difference is ${diff ?? "unknown"}.`,
        supportingFacts: [
          `Income You Reported: ${reportedAmount}`,
          `Income Reported to IRS: ${irsAmount}`,
          ...(extraction.incomeSource ? [`Income Source: ${extraction.incomeSource}`] : []),
        ],
        confidence: "high",
        recommendedAction: irsHigher
          ? "Verify whether the IRS amount is correct. If you did not receive the additional income, provide documentation showing the correct amount."
          : "Verify whether your reported amount is correct. If your records show a different amount than what the IRS has, provide supporting documentation.",
        unresolved: true,
      });
      findings.push(finding);

      discrepancies.push({
        id: crypto.randomUUID(),
        type: "amount_mismatch",
        description: `IRS reports ${irsAmount}, you reported ${reportedAmount}. Difference: ${diff ?? "unknown"}.`,
        irsAmount,
        userAmount: reportedAmount,
        difference: diff,
        possibleExplanations: [
          "The IRS received a corrected information return that you haven't seen",
          "The payer reported a different amount than what they paid you",
          "You may have received additional income not reflected on your return",
          "The income may belong to a different tax year",
          "The income may not be taxable (e.g., non-taxable distribution)",
        ],
        evidenceNeeded: [
          `Copy of the ${extraction.incomeSource ?? "information return"} from the payer`,
          "Your tax return for the referenced year",
          "Bank statements or payment records showing actual amounts received",
        ],
        confidence: "high",
        status: "unresolved",
        findingId: finding.id,
      });
    }
  }

  // ── Missing Income Data ──
  if (!reportedAmount && irsAmount) {
    const finding = createFinding({
      type: "documentation_gap",
      severity: "high",
      statement: `The IRS reports ${irsAmount} in income, but no reported income amount was found on your return in the notice text. This may indicate missing information or an extraction issue.`,
      supportingFacts: [
        `Income Reported to IRS: ${irsAmount}`,
        "Reported income amount: not found in notice text",
      ],
      confidence: "medium",
      recommendedAction: "Verify your actual reported income for the tax year in question and compare with the IRS amount.",
      unresolved: true,
    });
    findings.push(finding);

    discrepancies.push({
      id: crypto.randomUUID(),
      type: "documentation_gap",
      description: "Unable to compare amounts — your reported income was not found in the notice text.",
      irsAmount,
      userAmount: null,
      difference: null,
      possibleExplanations: [
        "The notice may not include your reported amount",
        "The extraction may have missed this field",
      ],
      evidenceNeeded: ["Your tax return for the referenced year"],
      confidence: "low",
      status: "unclear",
      findingId: finding.id,
    });
  }

  // ── Wrong Tax Year ──
  if (extraction.taxYear) {
    const currentYear = new Date().getFullYear();
    const taxYearNum = parseInt(extraction.taxYear);
    if (taxYearNum > currentYear) {
      const finding = createFinding({
        type: "wrong_tax_year",
        severity: "high",
        statement: `The notice references tax year ${extraction.taxYear}, which is in the future. This may indicate a processing error.`,
        supportingFacts: [`Tax Year: ${extraction.taxYear}`],
        confidence: "high",
        recommendedAction: "Verify the tax year on the notice. Contact the IRS if the year appears incorrect.",
        unresolved: true,
      });
      findings.push(finding);

      discrepancies.push({
        id: crypto.randomUUID(),
        type: "wrong_tax_year",
        description: `Notice references tax year ${extraction.taxYear}, which is in the future.`,
        irsAmount: null,
        userAmount: null,
        difference: null,
        possibleExplanations: ["IRS processing error", "Extraction error — verify the notice"],
        evidenceNeeded: ["The original notice document"],
        confidence: "high",
        status: "unresolved",
        findingId: finding.id,
      });
    }
  }

  // ── Deadline Risk ──
  if (!extraction.responseDeadline) {
    const finding = createFinding({
      type: "deadline_risk",
      severity: "high",
      statement: "No response deadline was found in the notice. A CP2000 typically includes a response deadline. Missing the deadline may result in the proposed changes being applied automatically.",
      supportingFacts: ["Response Deadline: not found in notice text"],
      confidence: "high",
      recommendedAction: "Locate the deadline on the notice. If you cannot find it, contact the IRS at the number on the notice or consult a tax professional.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Proposed Tax Increase ──
  if (extraction.proposedTaxIncrease) {
    const finding = createFinding({
      type: "proposed_change",
      severity: "high",
      statement: `The IRS proposes a tax increase of ${extraction.proposedTaxIncrease}${extraction.proposedPenalty ? ` plus an estimated penalty of ${extraction.proposedPenalty}` : ""}.`,
      supportingFacts: [
        `Proposed Tax Increase: ${extraction.proposedTaxIncrease}`,
        ...(extraction.proposedPenalty ? [`Estimated Penalty: ${extraction.proposedPenalty}`] : []),
      ],
      confidence: "high",
      recommendedAction: "Review the proposed changes. If you disagree, respond with supporting documentation before the deadline.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Classification Warning ──
  if (!extraction.isCP2000) {
    const finding = createFinding({
      type: "classification_warning",
      severity: "medium",
      statement: `The uploaded document was not confidently identified as a CP2000 notice. Classification confidence: ${(extraction.classificationConfidence * 100).toFixed(0)}%.`,
      supportingFacts: [`Classification confidence: ${extraction.classificationConfidence}`],
      confidence: "high",
      recommendedAction: "Verify that the uploaded document is actually a CP2000 notice. If it is a different notice type, use the appropriate workflow.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Extraction Warnings as Findings ──
  for (const warning of extraction.warnings) {
    const finding = createFinding({
      type: "missing_info",
      severity: "medium",
      statement: warning,
      supportingFacts: ["Extraction warning from system"],
      confidence: "medium",
      recommendedAction: "Review the notice manually to find the missing information.",
      unresolved: true,
    });
    findings.push(finding);
  }

  return {
    discrepancies,
    findings,
    unresolvedCount: discrepancies.filter((d) => d.status === "unresolved").length,
    totalIssues: findings.length,
  };
}
