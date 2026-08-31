/* ═══════════════════════════════════════════════════════════
   CP14 DISCREPANCY ANALYSIS — structured detection of
   issues in an IRS CP14 Balance Due notice.

   A CP14 asserts that the taxpayer has an unpaid balance.
   Unlike CP2000 (proposed changes), CP14 is an assertion
   that money is already owed.

   DISCREPANCY TYPES:
   - balance_already_paid: Balance was already paid
   - incorrect_balance: Balance amount appears wrong
   - penalty_error: Penalty calculation may be incorrect
   - interest_error: Interest calculation may be incorrect
   - duplicate_assessment: Same balance assessed twice
   - wrong_tax_year: Balance attributed to wrong year
   - documentation_gap: Missing documentation to verify

   The system NEVER tells the user they are "right" unless
   evidence supports that conclusion.

   ═══════════════════════════════════════════════════════════ */

import type { CP14Extraction } from "./cp14";
import { createFinding, type Finding } from "./cp14-findings";

// ── Discrepancy Types ────────────────────────────────────────

export type CP14DiscrepancyType =
  | "balance_already_paid"
  | "incorrect_balance"
  | "penalty_error"
  | "interest_error"
  | "duplicate_assessment"
  | "wrong_tax_year"
  | "documentation_gap";

export type CP14DiscrepancyStatus = "unresolved" | "user_correct" | "irs_correct" | "unclear";

export interface CP14Discrepancy {
  id: string;
  type: CP14DiscrepancyType;
  description: string;
  irsAmount: string | null;
  userAmount: string | null;
  difference: string | null;
  possibleExplanations: string[];
  evidenceNeeded: string[];
  confidence: "high" | "medium" | "low";
  status: CP14DiscrepancyStatus;
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

export interface CP14DiscrepancyInput {
  extraction: CP14Extraction;
  userFacts?: string;
  userObjective?: string;
}

export interface CP14DiscrepancyResult {
  discrepancies: CP14Discrepancy[];
  findings: Finding[];
  unresolvedCount: number;
  totalIssues: number;
}

export function analyzeCP14Discrepancies(input: CP14DiscrepancyInput): CP14DiscrepancyResult {
  const { extraction } = input;
  const discrepancies: CP14Discrepancy[] = [];
  const findings: Finding[] = [];

  // ── Balance Due Present ──
  if (extraction.balanceDue) {
    const finding = createFinding({
      type: "balance_dispute",
      severity: "high",
      statement: `The CP14 notice asserts an unpaid balance of ${extraction.balanceDue}${extraction.totalDue ? ` (total due: ${extraction.totalDue})` : ""}.`,
      supportingFacts: [
        `Balance Due: ${extraction.balanceDue}`,
        ...(extraction.totalDue ? [`Total Due: ${extraction.totalDue}`] : []),
        ...(extraction.penaltyAmount ? [`Penalty: ${extraction.penaltyAmount}`] : []),
        ...(extraction.interestAmount ? [`Interest: ${extraction.interestAmount}`] : []),
      ],
      confidence: "high",
      recommendedAction: "Verify whether this balance is correct. If you already paid it, provide proof of payment. If the amount is wrong, provide supporting documentation.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Total Due vs Balance Due Consistency ──
  if (extraction.balanceDue && extraction.totalDue) {
    const balanceNum = parseAmount(extraction.balanceDue);
    const totalNum = parseAmount(extraction.totalDue);
    const penaltyNum = parseAmount(extraction.penaltyAmount);
    const interestNum = parseAmount(extraction.interestAmount);

    if (balanceNum !== null && totalNum !== null) {
      const penaltyInterest = (penaltyNum ?? 0) + (interestNum ?? 0);
      const expectedTotal = balanceNum + penaltyInterest;

      if (Math.abs(expectedTotal - totalNum) > 1) {
        const diff = formatDifference(totalNum, expectedTotal);
        const finding = createFinding({
          type: "incorrect_balance",
          severity: "high",
          statement: `The total due (${extraction.totalDue}) does not match the balance due (${extraction.balanceDue}) plus penalty (${extraction.penaltyAmount ?? "$0"}) plus interest (${extraction.interestAmount ?? "$0"}). Difference: ${diff ?? "unknown"}.`,
          supportingFacts: [
            `Balance Due: ${extraction.balanceDue}`,
            `Total Due: ${extraction.totalDue}`,
            `Penalty: ${extraction.penaltyAmount ?? "not specified"}`,
            `Interest: ${extraction.interestAmount ?? "not specified"}`,
          ],
          confidence: "high",
          recommendedAction: "Verify the amounts on the notice. If the total does not add up correctly, note this discrepancy in your response.",
          unresolved: true,
        });
        findings.push(finding);

        discrepancies.push({
          id: crypto.randomUUID(),
          type: "incorrect_balance",
          description: `Total due (${extraction.totalDue}) does not match balance (${extraction.balanceDue}) + penalty (${extraction.penaltyAmount ?? "$0"}) + interest (${extraction.interestAmount ?? "$0"}). Difference: ${diff ?? "unknown"}.`,
          irsAmount: extraction.totalDue,
          userAmount: null,
          difference: diff,
          possibleExplanations: [
            "The notice may include additional fees not separately listed",
            "There may be a calculation error on the notice",
            "Prior payments or credits may not be reflected",
          ],
          evidenceNeeded: [
            "Payment records showing amounts already paid",
            "Prior IRS account transcript",
          ],
          confidence: "high",
          status: "unresolved",
          findingId: finding.id,
        });
      }
    }
  }

  // ── Penalty Amount Present ──
  if (extraction.penaltyAmount) {
    const penaltyNum = parseAmount(extraction.penaltyAmount);
    const balanceNum = parseAmount(extraction.balanceDue);

    if (penaltyNum !== null && balanceNum !== null && penaltyNum > 0) {
      const penaltyRate = (penaltyNum / balanceNum) * 100;
      const finding = createFinding({
        type: "penalty_error",
        severity: penaltyRate > 25 ? "high" : "medium",
        statement: `The notice includes a penalty of ${extraction.penaltyAmount} (${penaltyRate.toFixed(1)}% of the balance due). This may be eligible for abatement if you have a clean compliance history.`,
        supportingFacts: [
          `Penalty: ${extraction.penaltyAmount}`,
          `Balance Due: ${extraction.balanceDue}`,
        ],
        confidence: "medium",
        recommendedAction: "If this is your first penalty, you may qualify for First-Time Penalty Abatement. Consult IRS guidelines or a tax professional.",
        unresolved: true,
      });
      findings.push(finding);

      // Don't create a discrepancy unless the penalty seems unusual
      if (penaltyRate > 25) {
        discrepancies.push({
          id: crypto.randomUUID(),
          type: "penalty_error",
          description: `Penalty of ${extraction.penaltyAmount} is ${penaltyRate.toFixed(1)}% of the balance — unusually high. Verify the penalty calculation.`,
          irsAmount: extraction.penaltyAmount,
          userAmount: null,
          difference: null,
          possibleExplanations: [
            "Failure-to-pay penalty accumulates at 0.5% per month",
            "Failure-to-file penalty accumulates at 5% per month (max 25%)",
            "The penalty may include multiple types combined",
          ],
          evidenceNeeded: [
            "Prior payment records to verify when the balance originated",
            "IRS account transcript showing penalty calculation",
          ],
          confidence: "medium",
          status: "unclear",
          findingId: finding.id,
        });
      }
    }
  }

  // ── Interest Amount Present ──
  if (extraction.interestAmount) {
    const finding = createFinding({
      type: "interest_error",
      severity: "info",
      statement: `The notice includes interest of ${extraction.interestAmount}. Interest accrues on unpaid tax from the due date until paid.`,
      supportingFacts: [`Interest: ${extraction.interestAmount}`],
      confidence: "high",
      recommendedAction: "Interest cannot typically be abated but stops accruing once the balance is paid. Pay as soon as possible to minimize interest.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Installment Option ──
  if (extraction.installmentOption) {
    const finding = createFinding({
      type: "installment_eligible",
      severity: "info",
      statement: "The notice indicates that an installment agreement may be available. If you cannot pay the full balance, you may request a payment plan.",
      supportingFacts: ["Installment option mentioned in notice"],
      confidence: "high",
      recommendedAction: "If you cannot pay in full, consider filing Form 9465 (Installment Agreement Request) along with your response.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Deadline Risk ──
  if (!extraction.responseDeadline && !extraction.paymentDeadline) {
    const finding = createFinding({
      type: "deadline_risk",
      severity: "high",
      statement: "No response or payment deadline was found in the notice. A CP14 typically includes a payment deadline. Missing the deadline may result in further collection action.",
      supportingFacts: ["Response/Payment Deadline: not found in notice text"],
      confidence: "high",
      recommendedAction: "Locate the deadline on the notice. If you cannot find it, contact the IRS at the number on the notice or consult a tax professional immediately.",
      unresolved: true,
    });
    findings.push(finding);
  } else if (extraction.paymentDeadline) {
    const finding = createFinding({
      type: "deadline_risk",
      severity: "medium",
      statement: `Payment deadline: ${extraction.paymentDeadline}. Failure to pay or respond by this date may trigger further collection actions including liens or levies.`,
      supportingFacts: [`Payment Deadline: ${extraction.paymentDeadline}`],
      confidence: "high",
      recommendedAction: "Pay or respond before this deadline. If you cannot pay in full, consider an installment agreement or other payment options.",
      unresolved: true,
    });
    findings.push(finding);
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

  // ── Classification Warning ──
  if (!extraction.isCP14) {
    const finding = createFinding({
      type: "classification_warning",
      severity: "medium",
      statement: `The uploaded document was not confidently identified as a CP14 notice. Classification confidence: ${(extraction.classificationConfidence * 100).toFixed(0)}%.`,
      supportingFacts: [`Classification confidence: ${extraction.classificationConfidence}`],
      confidence: "high",
      recommendedAction: "Verify that the uploaded document is actually a CP14 notice. If it is a different notice type, use the appropriate workflow.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Extraction Warnings as Findings ──
  for (const warning of extraction.warnings) {
    const finding = createFinding({
      type: "missing_info",
      severity: "low",
      statement: `Extraction warning: ${warning}`,
      supportingFacts: [warning],
      confidence: "medium",
      recommendedAction: "Verify the notice content manually. The extraction may have missed or misread a field.",
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
