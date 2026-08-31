/* ═══════════════════════════════════════════════════════════
   CP523 DISCREPANCY ANALYSIS — structured detection of
   discrepancies between the IRS notice and the taxpayer's
   records regarding installment agreement default and
   intent to levy.

   DISCREPANCY TYPES:
   - payment_mismatch: User claims payments not reflected in IRS records
   - wrong_default_reason: User disputes the stated reason for default
   - balance_dispute: User disputes the balance due amount
   - installment_agreement_dispute: User disputes the termination
   - documentation_gap: Missing payment records or agreement documentation
   - levy_warning: Levy action threatened
   - deadline_risk: No response deadline found

   The system NEVER tells the user they are "right" unless
   the available evidence supports that conclusion.

   ═══════════════════════════════════════════════════════════ */

import type { CP523Extraction } from "./cp523";
import type { NoticeFact } from "./fact";
import { createFinding, type Finding } from "./cp523-findings";

// ── Discrepancy Types ────────────────────────────────────────

export type DiscrepancyType =
  | "payment_mismatch"
  | "wrong_default_reason"
  | "balance_dispute"
  | "installment_agreement_dispute"
  | "documentation_gap"
  | "levy_warning"
  | "deadline_risk";

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
  extraction: CP523Extraction;
  userFacts?: string;
  userObjective?: string;
}

export interface DiscrepancyResult {
  discrepancies: Discrepancy[];
  findings: Finding[];
  unresolvedCount: number;
  totalIssues: number;
}

export function analyzeCP523Discrepancies(input: DiscrepancyInput): DiscrepancyResult {
  const { extraction } = input;
  const discrepancies: Discrepancy[] = [];
  const findings: Finding[] = [];

  // ── Deadline Risk ──
  if (!extraction.responseDeadline && !extraction.cdpHearingDeadline) {
    const finding = createFinding({
      type: "deadline_risk",
      severity: "high",
      statement: "No response deadline was found in the notice. A CP523 typically gives 30 days to respond. Missing the deadline may result in termination of the installment agreement and collection action.",
      supportingFacts: ["Response Deadline: not found in notice text"],
      confidence: "high",
      recommendedAction: "Locate the deadline on the notice. If you cannot find it, contact the IRS at the number on the notice immediately.",
      unresolved: true,
    });
    findings.push(finding);

    discrepancies.push({
      id: crypto.randomUUID(),
      type: "deadline_risk",
      description: "No response deadline found — the CP523 typically gives 30 days. Verify immediately.",
      irsAmount: null,
      userAmount: null,
      difference: null,
      possibleExplanations: [
        "The deadline may be present but not detected by extraction",
        "The notice may reference '30 days from the date of this notice' without an explicit date",
      ],
      evidenceNeeded: ["The original CP523 notice"],
      confidence: "high",
      status: "unresolved",
      findingId: finding.id,
    });
  }

  // ── Levy Risk ──
  if (extraction.levyType) {
    const finding = createFinding({
      type: "levy_risk",
      severity: "critical",
      statement: `The notice indicates levy action (${extraction.levyType}). Assets are at risk if the installment agreement is terminated.`,
      supportingFacts: [
        `Levy Type: ${extraction.levyType}`,
        "Notice Type: CP523 — Intent to Levy",
      ],
      confidence: "high",
      recommendedAction: "Respond before the deadline. Consider requesting a CDP hearing to contest the levy action.",
      unresolved: true,
    });
    findings.push(finding);

    discrepancies.push({
      id: crypto.randomUUID(),
      type: "levy_warning",
      description: `Levy action indicated: ${extraction.levyType}. Assets at risk.`,
      irsAmount: null,
      userAmount: null,
      difference: null,
      possibleExplanations: [
        "The IRS intends to levy wages, bank accounts, or other assets",
        "The levy will proceed if the installment agreement is terminated",
      ],
      evidenceNeeded: ["The original CP523 notice"],
      confidence: "high",
      status: "unresolved",
      findingId: finding.id,
    });
  }

  // ── Passport Certification ──
  if (extraction.passportCertification) {
    const finding = createFinding({
      type: "passport_certification_warning",
      severity: "high",
      statement: "The notice references passport certification. Seriously delinquent tax debt may result in denial or revocation of a U.S. passport under the FAST Act.",
      supportingFacts: ["Passport Certification: detected"],
      confidence: "high",
      recommendedAction: "Verify whether the debt qualifies as 'seriously delinquent tax debt' under IRC §7345. Consider consulting a tax professional.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Proposed Termination ──
  if (extraction.terminationDate) {
    const finding = createFinding({
      type: "proposed_termination",
      severity: "critical",
      statement: `The IRS intends to terminate the installment agreement on ${extraction.terminationDate}. After termination, collection action including levy may begin.`,
      supportingFacts: [
        `Termination Date: ${extraction.terminationDate}`,
        "Notice Type: CP523",
      ],
      confidence: "high",
      recommendedAction: "Respond before the termination date. Request reinstatement or a CDP hearing.",
      unresolved: true,
    });
    findings.push(finding);
  } else {
    const finding = createFinding({
      type: "proposed_termination",
      severity: "high",
      statement: "The IRS intends to terminate the installment agreement and begin collection action. No specific termination date was found in the notice text.",
      supportingFacts: ["Termination Date: not found in notice text"],
      confidence: "medium",
      recommendedAction: "Verify the termination date on the notice and respond immediately.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Balance Dispute Detection ──
  const balanceDue = extraction.balanceDue ?? extraction.totalDue;
  if (balanceDue) {
    const finding = createFinding({
      type: "balance_dispute",
      severity: "high",
      statement: `The notice states a balance due of ${balanceDue}${extraction.penaltyAmount ? ` plus penalties of ${extraction.penaltyAmount}` : ""}${extraction.interestAmount ? ` plus interest of ${extraction.interestAmount}` : ""}.`,
      supportingFacts: [
        `Balance Due: ${balanceDue}`,
        ...(extraction.penaltyAmount ? [`Penalty: ${extraction.penaltyAmount}`] : []),
        ...(extraction.interestAmount ? [`Interest: ${extraction.interestAmount}`] : []),
      ],
      confidence: "high",
      recommendedAction: "Verify the balance due against your payment records. If the amount is incorrect, provide documentation showing the correct balance.",
      unresolved: true,
    });
    findings.push(finding);

    // Check for balance dispute in user facts
    if (input.userFacts) {
      const userAmountMatch = input.userFacts.match(/\$[\d,]+\.?\d*/g);
      if (userAmountMatch) {
        const userAmount = userAmountMatch[0];
        const irsNum = parseAmount(balanceDue);
        const userNum = parseAmount(userAmount);
        if (irsNum !== null && userNum !== null && irsNum !== userNum) {
          const diff = formatDifference(irsNum, userNum);
          const finding = createFinding({
            type: "balance_dispute",
            severity: "high",
            statement: `The IRS balance due is ${balanceDue}, but your records show ${userAmount}. Difference: ${diff ?? "unknown"}.`,
            supportingFacts: [
              `IRS Balance Due: ${balanceDue}`,
              `User-Reported Balance: ${userAmount}`,
            ],
            confidence: "medium",
            recommendedAction: "Provide payment records or bank statements showing the correct balance. Include any IRS payment confirmations.",
            unresolved: true,
          });
          findings.push(finding);

          discrepancies.push({
            id: crypto.randomUUID(),
            type: "balance_dispute",
            description: `IRS balance due is ${balanceDue}, but user records show ${userAmount}. Difference: ${diff ?? "unknown"}.`,
            irsAmount: balanceDue,
            userAmount,
            difference: diff,
            possibleExplanations: [
              "Payments made after the notice was generated may not be reflected",
              "Penalty or interest accrual may differ from user's calculation",
              "The IRS may not have recorded all payments",
            ],
            evidenceNeeded: [
              "Payment records (bank statements, canceled checks)",
              "IRS payment confirmations",
              "Installment agreement payment history",
            ],
            confidence: "medium",
            status: "unresolved",
            findingId: finding.id,
          });
        }
      }
    }
  }

  // ── Documentation Gap ──
  if (!extraction.installmentAgreementNumber) {
    const finding = createFinding({
      type: "documentation_gap",
      severity: "medium",
      statement: "The installment agreement number was not found in the notice text. This may be needed for reinstatement requests.",
      supportingFacts: ["Installment Agreement Number: not found in notice text"],
      confidence: "medium",
      recommendedAction: "Locate the installment agreement number from prior correspondence or IRS records.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Default Reason ──
  if (!extraction.defaultReason) {
    const finding = createFinding({
      type: "documentation_gap",
      severity: "medium",
      statement: "The reason for default was not found in the notice text. The notice should state why the installment agreement is in default.",
      supportingFacts: ["Default Reason: not found in notice text"],
      confidence: "medium",
      recommendedAction: "Verify the default reason on the notice. Contact the IRS if the reason is unclear.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Classification Warning ──
  if (!extraction.isCP523) {
    const finding = createFinding({
      type: "classification_warning",
      severity: "medium",
      statement: `The uploaded document was not confidently identified as a CP523 notice. Classification confidence: ${(extraction.classificationConfidence * 100).toFixed(0)}%.`,
      supportingFacts: [`Classification confidence: ${extraction.classificationConfidence}`],
      confidence: "high",
      recommendedAction: "Verify that the uploaded document is actually a CP523 notice. If it is a different notice type, use the appropriate workflow.",
      unresolved: true,
    });
    findings.push(finding);
  }

  // ── Extraction Warnings as Findings ──
  for (const warning of extraction.warnings) {
    if (warning.includes("deadline") || warning.includes("Levy") || warning.includes("Passport")) {
      // Already covered by specific findings above
      continue;
    }
    const finding = createFinding({
      type: "missing_info",
      severity: "low",
      statement: warning,
      supportingFacts: ["Extraction warning"],
      confidence: "high",
      recommendedAction: "Verify the notice and provide any missing information.",
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
