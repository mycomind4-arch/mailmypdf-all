/* ═══════════════════════════════════════════════════════════
   CP14 RESPONSE STRATEGY — derives the response position
   from the case evidence, not from assumptions.

   CP14 strategy positions differ from CP2000:
   - pay_full: Agree with the balance, pay in full
   - dispute_balance: Dispute the amount owed
   - request_installment: Agree but cannot pay, request payment plan
   - request_abatement: Request penalty abatement
   - insufficient_info: Not enough info to determine position
   - needs_professional_review: Complex case, recommend professional

   The strategy is NEVER automatically chosen. It derives from:
   - extracted notice facts
   - verified user facts
   - discrepancy analysis
   - evidence availability
   - deadline status
   - installment option

   ═══════════════════════════════════════════════════════════ */

import type { CP14Discrepancy } from "./cp14-discrepancy";
import type { Finding } from "./cp14-findings";
import type { CP14EvidenceChecklistItem } from "./cp14-evidence";
import { getCP14ResearchPack } from "./cp14-research";

// ── Strategy Position ────────────────────────────────────────

export type CP14StrategyPosition =
  | "pay_full"
  | "dispute_balance"
  | "request_installment"
  | "request_abatement"
  | "insufficient_info"
  | "needs_professional_review";

export interface CP14ResponseStrategy {
  position: CP14StrategyPosition;
  issues: string[];
  evidenceToInclude: string[];
  explanations: string[];
  corrections: string[];
  unresolvedIssues: string[];
  requestedActions: string[];
  supportingSources: string[];
  riskFlags: string[];
  confidence: "high" | "medium" | "low";
}

// ── Strategy Generator ───────────────────────────────────────

export interface CP14StrategyInput {
  discrepancies: CP14Discrepancy[];
  findings: Finding[];
  evidence: CP14EvidenceChecklistItem[];
  userFacts?: string | null;
  userObjective?: string | null;
  hasDeadline: boolean;
  extractionConfident: boolean;
  installmentOption: boolean;
}

export function generateCP14Strategy(input: CP14StrategyInput): CP14ResponseStrategy {
  const { discrepancies, findings, evidence, hasDeadline, extractionConfident, installmentOption } = input;

  const issues: string[] = [];
  const evidenceToInclude: string[] = [];
  const explanations: string[] = [];
  const corrections: string[] = [];
  const unresolvedIssues: string[] = [];
  const requestedActions: string[] = [];
  const supportingSources: string[] = [];
  const riskFlags: string[] = [];

  // ── Determine position ──
  let position: CP14StrategyPosition;

  const incorrectBalance = discrepancies.filter((d) => d.type === "incorrect_balance");
  const hasCriticalFindings = findings.some((f) => f.severity === "critical");
  const hasEvidenceGaps = evidence.filter((e) => e.requirement === "required" && e.state === "missing").length > 0;
  const userObjective = input.userObjective?.toLowerCase() ?? "";
  const userFacts = input.userFacts?.toLowerCase() ?? "";

  if (!extractionConfident) {
    position = "insufficient_info";
    riskFlags.push("Document classification confidence is low — verify the document is a CP14");
  } else if (userObjective.includes("dispute") || userObjective.includes("disputing") || userObjective.includes("disagree") || userObjective.includes("wrong") || incorrectBalance.length > 0) {
    // User disputes the balance or we found balance discrepancies
    position = "dispute_balance";
    for (const d of incorrectBalance) {
      issues.push(d.description);
      evidenceToInclude.push(...d.evidenceNeeded);
    }
    if (hasEvidenceGaps) {
      riskFlags.push("Some required evidence is missing — response may be incomplete");
      unresolvedIssues.push("Missing evidence items need to be provided before mailing");
    }
  } else if (userObjective.includes("installment") || userObjective.includes("payment plan") || userObjective.includes("can't pay") || userObjective.includes("cannot pay")) {
    // User wants an installment agreement
    position = "request_installment";
    if (!installmentOption) {
      riskFlags.push("The notice does not explicitly mention installment options — verify eligibility with the IRS");
    }
    requestedActions.push("Complete Form 9465 (Installment Agreement Request)");
    requestedActions.push("Propose a monthly payment amount you can afford");
  } else if (userObjective.includes("abatement") || userObjective.includes("penalty")) {
    // User wants penalty abatement
    position = "request_abatement";
    requestedActions.push("Request First-Time Penalty Abatement if you have a clean compliance history");
    requestedActions.push("Provide documentation supporting reasonable cause if applicable");
  } else if (incorrectBalance.length === 0) {
    // No balance discrepancies — likely pay
    position = "pay_full";
    if (hasEvidenceGaps) {
      riskFlags.push("Some required evidence is missing — gather before mailing");
    }
    requestedActions.push("Pay the balance by the deadline to stop further interest and penalties");
    requestedActions.push("Keep proof of payment");
  } else {
    position = "insufficient_info";
    unresolvedIssues.push("Insufficient information to determine response position");
  }

  // ── Deadline risk ──
  if (!hasDeadline) {
    riskFlags.push("No response/payment deadline found — verify the deadline on the notice immediately");
    requestedActions.push("Locate and verify the payment deadline on the notice");
  }

  // ── Large balance warning ──
  const balanceFindings = findings.filter((f) => f.type === "balance_dispute");
  for (const f of balanceFindings) {
    if (f.severity === "critical" || f.severity === "high") {
      riskFlags.push("Significant balance detected — consider consulting a tax professional");
    }
  }

  // ── Evidence guidance ──
  for (const item of evidence) {
    if (item.requirement === "required" && item.state === "missing") {
      explanations.push(`${item.label} is required but not yet provided`);
    }
    if (item.requirement === "recommended" && item.state === "missing") {
      explanations.push(`${item.label} is recommended to strengthen the response`);
    }
  }

  // ── Research sources ──
  const researchPack = getCP14ResearchPack();
  for (const source of researchPack.sources) {
    supportingSources.push(`${source.title} — ${source.url}`);
  }

  // ── Requested actions (shared) ──
  if (position === "pay_full") {
    requestedActions.push("Send payment to the address on the notice");
    requestedActions.push("Include the notice number on your payment");
  }
  if (position === "dispute_balance") {
    requestedActions.push("Explain specifically why the balance is incorrect");
    requestedActions.push("Provide documentation supporting the correct balance");
  }
  requestedActions.push("Keep copies of all documents sent to the IRS");

  // ── Confidence ──
  let confidence: "high" | "medium" | "low";
  if (riskFlags.length === 0 && unresolvedIssues.length === 0) {
    confidence = "high";
  } else if (riskFlags.length <= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    position,
    issues,
    evidenceToInclude,
    explanations,
    corrections,
    unresolvedIssues,
    requestedActions,
    supportingSources,
    riskFlags,
    confidence,
  };
}

// ── Strategy Labels ──────────────────────────────────────────

export const CP14_STRATEGY_POSITION_LABELS: Record<CP14StrategyPosition, string> = {
  pay_full: "Pay the balance in full",
  dispute_balance: "Dispute the balance amount",
  request_installment: "Request an installment agreement",
  request_abatement: "Request penalty abatement",
  insufficient_info: "Insufficient information to determine position",
  needs_professional_review: "Needs professional tax review",
};
