/* ═══════════════════════════════════════════════════════════
   CP2000 RESPONSE STRATEGY — derives the response position
   from the case evidence, not from assumptions.

   The strategy is NEVER automatically chosen. It derives from:
   - extracted notice facts
   - verified user facts
   - discrepancy analysis
   - evidence availability
   - deadline status

   ═══════════════════════════════════════════════════════════ */

import type { CP2000Case, CP2000ResponseStrategy, StrategyPosition } from "./cp2000-case";
import type { Discrepancy } from "./cp2000-discrepancy";
import type { Finding } from "./cp2000-findings";
import type { EvidenceChecklistItem } from "./cp2000-evidence";
import { getCP2000ResearchPack } from "./cp2000-research";

// ── Strategy Generator ───────────────────────────────────────

export interface StrategyInput {
  discrepancies: Discrepancy[];
  findings: Finding[];
  evidence: EvidenceChecklistItem[];
  userFacts?: string | null;
  userObjective?: string | null;
  hasDeadline: boolean;
  extractionConfident: boolean;
}

export function generateCP2000Strategy(input: StrategyInput): CP2000ResponseStrategy {
  const { discrepancies, findings, evidence, hasDeadline, extractionConfident } = input;

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

  const amountMismatches = discrepancies.filter((d) => d.type === "amount_mismatch");
  const documentationGaps = discrepancies.filter((d) => d.type === "documentation_gap");
  const hasCriticalFindings = findings.some((f) => f.severity === "critical");
  const hasEvidenceGaps = evidence.filter((e) => e.requirement === "required" && e.state === "missing").length > 0;

  if (!extractionConfident) {
    position = "insufficient_info";
    riskFlags.push("Document classification confidence is low — verify the document is a CP2000");
  } else if (amountMismatches.length === 0 && documentationGaps.length === 0) {
    // No discrepancies found — likely agree
    position = "agree_all";
    requestedActions.push("Sign and return the response form if you agree with the proposed changes");
  } else if (hasCriticalFindings && hasEvidenceGaps) {
    // Critical findings but missing evidence
    position = "insufficient_info";
    riskFlags.push("Critical discrepancies identified but required evidence is missing");
    unresolvedIssues.push("Gather required evidence before finalizing response");
  } else if (amountMismatches.length > 0 && !hasEvidenceGaps) {
    // Discrepancies with evidence available
    position = "disagree_some";
    for (const d of amountMismatches) {
      issues.push(d.description);
      evidenceToInclude.push(...d.evidenceNeeded);
    }
  } else if (amountMismatches.length > 0 && hasEvidenceGaps) {
    // Discrepancies but some evidence missing
    position = "disagree_some";
    riskFlags.push("Some required evidence is missing — response may be incomplete");
    for (const d of amountMismatches) {
      issues.push(d.description);
      evidenceToInclude.push(...d.evidenceNeeded.filter((e) => 
        evidence.find((item) => item.label === e && item.state !== "missing")
      ));
    }
    unresolvedIssues.push("Missing evidence items need to be provided before mailing");
  } else {
    position = "insufficient_info";
    unresolvedIssues.push("Insufficient information to determine response position");
  }

  // ── Deadline risk ──
  if (!hasDeadline) {
    riskFlags.push("No response deadline found — verify the deadline on the notice immediately");
    requestedActions.push("Locate and verify the response deadline on the notice");
  }

  // ── Escalation for large amounts ──
  const criticalAmountFindings = findings.filter(
    (f) => f.severity === "critical" && f.type === "income_mismatch",
  );
  if (criticalAmountFindings.length > 0) {
    riskFlags.push("Large income discrepancy detected — consider consulting a tax professional");
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
  const researchPack = getCP2000ResearchPack();
  for (const source of researchPack.sources) {
    supportingSources.push(`${source.title} — ${source.url}`);
  }

  // ── Requested actions ──
  if (position === "disagree_some" || position === "disagree_all") {
    requestedActions.push("Provide documentation supporting the income you reported");
    requestedActions.push("Explain each discrepancy with specific evidence");
  }
  if (position === "agree_all") {
    requestedActions.push("Sign and date the response form");
    requestedActions.push("Return the form to the address on the notice");
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
  agree_all: "Agree with all proposed changes",
  disagree_some: "Disagree with some proposed changes",
  disagree_all: "Disagree with all proposed changes",
  insufficient_info: "Insufficient information to determine position",
  needs_professional_review: "Needs professional tax review",
};
