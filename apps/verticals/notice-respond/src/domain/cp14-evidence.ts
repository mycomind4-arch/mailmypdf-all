/* ═══════════════════════════════════════════════════════════
   CP14 EVIDENCE CHECKLIST — dynamically generated based on
   the identified discrepancies and findings.

   Not a static list — the checklist is built from the analysis.
   Each evidence item links to the finding it supports.

   CP14 evidence types differ from CP2000:
   - Payment records (proof of payment)
   - Account transcripts
   - Installment agreement forms
   - Penalty abatement documentation
   - Prior correspondence

   ═══════════════════════════════════════════════════════════ */

import type { CP14Discrepancy } from "./cp14-discrepancy";
import type { Finding } from "./cp14-findings";
import type { CP14Extraction } from "./cp14";

// ── Evidence States ──────────────────────────────────────────

export type CP14EvidenceRequirement = "required" | "recommended" | "optional" | "not_applicable";

export type CP14EvidenceState =
  | "missing"
  | "provided"
  | "under_review"
  | "verified"
  | "rejected"
  | "not_applicable";

export interface CP14EvidenceChecklistItem {
  id: string;
  type: string;
  label: string;
  purpose: string;
  requirement: CP14EvidenceRequirement;
  state: CP14EvidenceState;
  supportsFindings: string[];
  supportsDiscrepancies: string[];
  verificationNotes?: string;
  confidence: "high" | "medium" | "low" | "unverified";
  provenance?: string;
}

// ── Build Checklist ──────────────────────────────────────────

export interface CP14EvidenceChecklistInput {
  extraction: CP14Extraction;
  discrepancies: CP14Discrepancy[];
  findings: Finding[];
}

export interface CP14EvidenceChecklistResult {
  items: CP14EvidenceChecklistItem[];
  requiredCount: number;
  providedCount: number;
  missingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  underReviewCount: number;
  complete: boolean;
  /** True when no required items are missing or rejected */
  ready: boolean;
}

export function buildCP14EvidenceChecklist(
  input: CP14EvidenceChecklistInput,
): CP14EvidenceChecklistResult {
  const items: CP14EvidenceChecklistItem[] = [];
  const { extraction, discrepancies, findings } = input;

  // ── The CP14 notice itself ──
  items.push({
    id: crypto.randomUUID(),
    type: "cp14_notice",
    label: "CP14 Notice",
    purpose: "The original IRS notice being responded to",
    requirement: "required",
    state: "provided",
    confidence: "high",
    supportsFindings: findings.map((f) => f.id),
    supportsDiscrepancies: discrepancies.map((d) => d.id),
  });

  // ── Tax return for the referenced year (if balance is disputed) ──
  if (extraction.taxYear) {
    items.push({
      id: crypto.randomUUID(),
      type: "tax_return",
      label: `Tax Return (Form 1040) for ${extraction.taxYear}`,
      purpose: "Shows what was reported for the tax year in question",
      requirement: "recommended",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "balance_dispute" || f.type === "incorrect_balance").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "incorrect_balance").map((d) => d.id),
    });
  }

  // ── Payment records (proof of payment) ──
  if (extraction.balanceDue) {
    items.push({
      id: crypto.randomUUID(),
      type: "payment_records",
      label: "Payment Records",
      purpose: "Proof of any payments already made toward the balance",
      requirement: "required",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "balance_dispute").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "balance_already_paid").map((d) => d.id),
    });
  }

  // ── IRS account transcript ──
  if (discrepancies.some((d) => d.type === "incorrect_balance" || d.type === "penalty_error")) {
    items.push({
      id: crypto.randomUUID(),
      type: "account_transcript",
      label: "IRS Account Transcript",
      purpose: "Shows the IRS's record of assessments, payments, and penalties",
      requirement: "required",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "incorrect_balance" || f.type === "penalty_error").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "incorrect_balance" || d.type === "penalty_error").map((d) => d.id),
    });
  }

  // ── Installment agreement form (if installment option mentioned) ──
  if (extraction.installmentOption) {
    items.push({
      id: crypto.randomUUID(),
      type: "form_9465",
      label: "Form 9465 — Installment Agreement Request",
      purpose: "Request a payment plan if you cannot pay the full balance",
      requirement: "optional",
      state: "missing",
      confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "installment_eligible").map((f) => f.id),
      supportsDiscrepancies: [],
    });
  }

  // ── Penalty abatement documentation ──
  const penaltyFindings = findings.filter((f) => f.type === "penalty_error");
  if (penaltyFindings.length > 0) {
    items.push({
      id: crypto.randomUUID(),
      type: "abatement_docs",
      label: "Penalty Abatement Documentation",
      purpose: "Supporting documentation for First-Time Penalty Abatement or reasonable cause",
      requirement: "recommended",
      state: "missing",
      confidence: "unverified",
      supportsFindings: penaltyFindings.map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "penalty_error").map((d) => d.id),
    });
  }

  // ── Prior correspondence with IRS ──
  items.push({
    id: crypto.randomUUID(),
    type: "correspondence",
    label: "Prior IRS Correspondence (if any)",
    purpose: "Shows any previous communications about this balance",
    requirement: "optional",
    state: "missing",
    confidence: "unverified",
    supportsFindings: [],
    supportsDiscrepancies: [],
  });

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

export function updateCP14EvidenceItemState(
  items: CP14EvidenceChecklistItem[],
  itemId: string,
  newState: CP14EvidenceState,
): CP14EvidenceChecklistItem[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, state: newState } : item,
  );
}
