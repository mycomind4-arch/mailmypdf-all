/* ═══════════════════════════════════════════════════════════
   CP523 RESPONSE STRATEGY — derives the response position
   from the case evidence, not from assumptions.

   The strategy is NEVER automatically chosen. It derives from:
   - extracted notice facts
   - verified user facts
   - discrepancy analysis
   - evidence availability
   - deadline status

   ═══════════════════════════════════════════════════════════ */

import type { CP523Case, CP523ResponseStrategy, StrategyPosition } from "./cp523-case";
import type { Discrepancy } from "./cp523-discrepancy";
import type { Finding } from "./cp523-findings";
import type { EvidenceChecklistItem } from "./cp523-evidence";
import { getCP523ResearchPack } from "./cp523-research";

// ── Strategy Generator ───────────────────────────────────────

export interface StrategyInput {
  discrepancies: Discrepancy[];
  findings: Finding[];
  evidence: EvidenceChecklistItem[];
  userFacts?: string | null;
  userObjective?: string | null;
  hasDeadline: boolean;
  extractionConfident: boolean;
  cdpRightsNotice: boolean;
}

export function generateCP523Strategy(input: StrategyInput): CP523ResponseStrategy {
  const { discrepancies, findings, evidence, hasDeadline, extractionConfident, cdpRightsNotice } = input;

  const issues: string[] = [];
  const evidenceToInclude: string[] = [];
  const explanations: string[] = [];
  const corrections: string[] = [];
  const unresolvedIssues: string[] = [];
  const requestedActions: string[] = [];
  const supportingSources: string[] = [];
  const riskFlags: string[] = [];

  // ── Determine position ──
  let position: StrategyPosition;

  const balanceDisputes = discrepancies.filter((d) => d.type === "balance_dispute");
  const levyWarnings = discrepancies.filter((d) => d.type === "levy_warning");
  const hasCriticalFindings = findings.some((f) => f.severity === "critical");
  const hasEvidenceGaps = evidence.filter((e) => e.requirement === "required" && e.state === "missing").length > 0;

  if (!extractionConfident) {
    position = "insufficient_info";
    riskFlags.push("Document classification confidence is low — verify the document is a CP523");
  } else if (input.userObjective?.toLowerCase().includes("cdp") || input.userObjective?.toLowerCase().includes("hearing")) {
    position = "request_cdp_hearing";
    requestedActions.push("Request a Collection Due Process (CDP) hearing");
    requestedActions.push("Submit Form 12153 if available");
  } else if (input.userObjective?.toLowerCase().includes("reinstate") || input.userObjective?.toLowerCase().includes("reinstatement")) {
    position = "reinstate_agreement";
    requestedActions.push("Request reinstatement of the installment agreement");
    requestedActions.push("Make the missed payment before the termination date");
  } else if (input.userObjective?.toLowerCase().includes("dispute") || input.userObjective?.toLowerCase().includes("wrong")) {
    position = "dispute_default";
    for (const f of findings.filter((f) => f.type === "proposed_termination")) {
      issues.push(f.statement);
    }
    if (cdpRightsNotice) {
      requestedActions.push("Request a CDP hearing if the dispute cannot be resolved by phone");
    }
  } else if (balanceDisputes.length > 0) {
    position = "dispute_balance";
    for (const d of balanceDisputes) {
      issues.push(d.description);
      evidenceToInclude.push(...d.evidenceNeeded);
    }
    requestedActions.push("Provide payment records showing the correct balance");
  } else if (input.userObjective?.toLowerCase().includes("pay") || input.userObjective?.toLowerCase().includes("full")) {
    position = "pay_in_full";
    requestedActions.push("Pay the full balance before the termination date");
  } else if (input.userObjective?.toLowerCase().includes("new") || input.userObjective?.toLowerCase().includes("new installment")) {
    position = "new_installment";
    requestedActions.push("Request a new installment agreement");
    requestedActions.push("Submit Form 9465 with financial information");
  } else if (hasCriticalFindings && hasEvidenceGaps) {
    position = "insufficient_info";
    riskFlags.push("Critical findings identified but required evidence is missing");
    unresolvedIssues.push("Gather required evidence before finalizing response");
  } else if (cdpRightsNotice) {
    position = "reinstate_agreement";
    requestedActions.push("Request reinstatement of the installment agreement");
    requestedActions.push("Make the missed payment to prevent termination");
    if (cdpRightsNotice) {
      requestedActions.push("Consider requesting a CDP hearing if reinstatement is denied");
    }
  } else {
    position = "insufficient_info";
    unresolvedIssues.push("Insufficient information to determine response position");
  }

  // ── Deadline risk ──
  if (!hasDeadline) {
    riskFlags.push("No response deadline found — verify the deadline on the notice immediately");
    requestedActions.push("Locate and verify the response deadline on the notice");
  }

  // ── Levy risk ──
  if (levyWarnings.length > 0) {
    riskFlags.push("Levy action indicated — assets are at risk. Respond before the deadline.");
  }

  // ── Passport risk ──
  if (findings.some((f) => f.type === "passport_certification_warning")) {
    riskFlags.push("Passport certification detected — seriously delinquent tax debt may affect passport status");
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
  const researchPack = getCP523ResearchPack();
  for (const source of researchPack.sources) {
    supportingSources.push(`${source.title} — ${source.url}`);
  }

  // ── Requested actions ──
  if (position === "reinstate_agreement" || position === "new_installment") {
    requestedActions.push("Include payment records demonstrating ability to pay");
    requestedActions.push("Include Form 433-F if financial situation has changed");
  }
  if (position === "request_cdp_hearing") {
    requestedActions.push("Explain why you disagree with the termination");
    requestedActions.push("Include evidence supporting your position");
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

export const STRATEGY_POSITION_LABELS: Record<StrategyPosition, string> = {
  reinstate_agreement: "Request reinstatement of the installment agreement",
  request_cdp_hearing: "Request a Collection Due Process hearing",
  dispute_default: "Dispute the default determination",
  dispute_balance: "Dispute the balance due amount",
  pay_in_full: "Pay the balance in full",
  new_installment: "Request a new installment agreement",
  insufficient_info: "Insufficient information to determine position",
  needs_professional_review: "Needs professional tax review",
};
