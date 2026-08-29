/* ═══════════════════════════════════════════════════════════
   CP523 EVIDENCE CHECKLIST — dynamically generated based on
   the identified discrepancies and findings.

   Not a static list — the checklist is built from the analysis.
   Each evidence item links to the finding it supports.

   ═══════════════════════════════════════════════════════════ */

import type { Discrepancy } from "./cp523-discrepancy";
import type { Finding } from "./cp523-findings";
import type { CP523Extraction } from "./cp523";

// ── Evidence States ──────────────────────────────────────────

export type EvidenceRequirement = "required" | "recommended" | "optional" | "not_applicable";

export type EvidenceState =
  | "missing"
  | "provided"
  | "under_review"
  | "verified"
  | "rejected"
  | "not_applicable";

export interface EvidenceChecklistItem {
  id: string;
  type: string;
  label: string;
  purpose: string;
  requirement: EvidenceRequirement;
  state: EvidenceState;
  supportsFindings: string[];
  supportsDiscrepancies: string[];
  verificationNotes?: string;
  confidence: "high" | "medium" | "low" | "unverified";
  provenance?: string;
}

// ── Build Checklist ──────────────────────────────────────────

export interface EvidenceChecklistInput {
  extraction: CP523Extraction;
  discrepancies: Discrepancy[];
  findings: Finding[];
}

export interface EvidenceChecklistResult {
  items: EvidenceChecklistItem[];
  requiredCount: number;
  providedCount: number;
  missingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  underReviewCount: number;
  complete: boolean;
  ready: boolean;
}

export function buildCP523EvidenceChecklist(
  input: EvidenceChecklistInput,
): EvidenceChecklistResult {
  const items: EvidenceChecklistItem[] = [];
  const { extraction, discrepancies, findings } = input;

  // ── The CP523 notice itself ──
  items.push({
    id: crypto.randomUUID(),
    type: "cp523_notice",
    label: "CP523 Notice",
    purpose: "The original IRS notice being responded to",
    requirement: "required",
    state: "provided",
    confidence: "high",
    supportsFindings: findings.map((f) => f.id),
    supportsDiscrepancies: discrepancies.map((d) => d.id),
  });

  // ── Installment agreement documentation ──
  items.push({
    id: crypto.randomUUID(),
    type: "installment_agreement",
    label: "Installment Agreement Documentation",
    purpose: "Shows the terms of the original installment agreement",
    requirement: "required",
    state: "missing",
    confidence: "unverified",
    supportsFindings: findings.filter((f) => f.type === "installment_agreement_dispute" || f.type === "proposed_termination").map((f) => f.id),
    supportsDiscrepancies: discrepancies.filter((d) => d.type === "installment_agreement_dispute").map((d) => d.id),
  });

  // ── Payment records ──
  items.push({
    id: crypto.randomUUID(),
    type: "payment_records",
    label: "Payment Records (Bank Statements, Canceled Checks, IRS Confirmations)",
    purpose: "Shows payment history under the installment agreement",
    requirement: "required",
    state: "missing",
    confidence: "unverified",
    supportsFindings: findings.filter((f) => f.type === "payment_mismatch" || f.type === "balance_dispute").map((f) => f.id),
    supportsDiscrepancies: discrepancies.filter((d) => d.type === "payment_mismatch" || d.type === "balance_dispute").map((d) => d.id),
  });

  // ── Tax returns for covered years ──
  if (extraction.taxYearsCovered.length > 0) {
    items.push({
      id: crypto.randomUUID(),
      type: "tax_returns",
      label: `Tax Returns for ${extraction.taxYearsCovered.join(", ")}`,
      purpose: "Shows the tax years covered by the installment agreement",
      requirement: "required",
      state: "missing",
      confidence: "unverified",
      supportsFindings: [],
      supportsDiscrepancies: [],
    });
  }

  // ── Financial statement (Form 433-F) ──
  if (discrepancies.some((d) => d.type === "balance_dispute") || extraction.balanceDue) {
    items.push({
      id: crypto.randomUUID(),
      type: "financial_statement",
      label: "Form 433-F (Collection Information Statement)",
      purpose: "Shows current financial situation if requesting reinstatement or new installment agreement",
      requirement: "recommended",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "proposed_termination").map((f) => f.id),
      supportsDiscrepancies: [],
    });
  }

  // ── Form 9465 (if requesting new installment agreement) ──
  items.push({
    id: crypto.randomUUID(),
    type: "form_9465",
    label: "Form 9465 (Installment Agreement Request)",
    purpose: "If requesting a new installment agreement or reinstatement",
    requirement: "optional",
    state: "missing",
    confidence: "unverified",
    supportsFindings: [],
    supportsDiscrepancies: [],
  });

  // ── Prior IRS correspondence ──
  items.push({
    id: crypto.randomUUID(),
    type: "correspondence",
    label: "Prior IRS Correspondence (if any)",
    purpose: "Shows previous communications about the installment agreement",
    requirement: "optional",
    state: "missing",
    confidence: "unverified",
    supportsFindings: [],
    supportsDiscrepancies: [],
  });

  // ── CDP hearing request (Form 12153) ──
  if (extraction.cdpRightsNotice) {
    items.push({
      id: crypto.randomUUID(),
      type: "cdp_request",
      label: "Form 12153 (Request for Collection Due Process Hearing)",
      purpose: "If requesting a CDP hearing to contest the levy",
      requirement: "recommended",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "levy_risk").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "levy_warning").map((d) => d.id),
    });
  }

  // ── Calculate summary ──
  const requiredCount = items.filter((i) => i.requirement === "required").length;
  const providedCount = items.filter((i) => i.state === "provided").length;
  const missingCount = items.filter((i) => i.state === "missing").length;
  const verifiedCount = items.filter((i) => i.state === "verified").length;
  const rejectedCount = items.filter((i) => i.state === "rejected").length;
  const underReviewCount = items.filter((i) => i.state === "under_review").length;

  const requiredItems = items.filter((i) => i.requirement === "required");
  const requiredMissing = requiredItems.filter((i) => i.state === "missing").length;
  const requiredRejected = requiredItems.filter((i) => i.state === "rejected").length;

  return {
    items,
    requiredCount,
    providedCount,
    missingCount,
    verifiedCount,
    rejectedCount,
    underReviewCount,
    complete: missingCount === 0,
    ready: requiredMissing === 0 && requiredRejected === 0,
  };
}

// ── Update item state ────────────────────────────────────────

export function updateEvidenceItemState(
  items: EvidenceChecklistItem[],
  itemId: string,
  newState: EvidenceState,
): EvidenceChecklistItem[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, state: newState } : item,
  );
}
