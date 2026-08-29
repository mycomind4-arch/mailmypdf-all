/* ═══════════════════════════════════════════════════════════
   CP2000 EVIDENCE CHECKLIST — dynamically generated based on
   the identified discrepancies and findings.

   Not a static list — the checklist is built from the analysis.
   Each evidence item links to the finding it supports.

   ═══════════════════════════════════════════════════════════ */

import type { Discrepancy } from "./cp2000-discrepancy";
import type { Finding } from "./cp2000-findings";
import type { CP2000Extraction } from "./cp2000";

// ── Evidence States ──────────────────────────────────────────

// Re-use the shared evidence lifecycle from evidence.ts
export type EvidenceRequirement = "required" | "recommended" | "optional" | "not_applicable";

// Evidence state follows the shared lifecycle:
// MISSING → PROVIDED → UNDER_REVIEW → VERIFIED | REJECTED
// NOT_APPLICABLE (terminal)
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
  extraction: CP2000Extraction;
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
  /** True when no required items are missing or rejected */
  ready: boolean;
}

export function buildCP2000EvidenceChecklist(
  input: EvidenceChecklistInput,
): EvidenceChecklistResult {
  const items: EvidenceChecklistItem[] = [];
  const { extraction, discrepancies, findings } = input;

  // ── The CP2000 notice itself ──
  items.push({
    id: crypto.randomUUID(),
    type: "cp2000_notice",
    label: "CP2000 Notice",
    purpose: "The original IRS notice being responded to",
    requirement: "required",
    state: "provided",
    confidence: "high",
    supportsFindings: findings.map((f) => f.id),
    supportsDiscrepancies: discrepancies.map((d) => d.id),
  });

  // ── Tax return for the referenced year ──
  if (extraction.taxYear) {
    items.push({
      id: crypto.randomUUID(),
      type: "tax_return",
      label: `Tax Return (Form 1040) for ${extraction.taxYear}`,
      purpose: "Shows what income was actually reported on the return",
      requirement: "required",
      state: "missing",
    confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "income_mismatch").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "amount_mismatch").map((d) => d.id),
    });
  }

  // ── Information return (W-2, 1099, etc.) ──
  if (extraction.incomeSource) {
    items.push({
      id: crypto.randomUUID(),
      type: "information_return",
      label: `Copy of ${extraction.incomeSource}`,
      purpose: "Shows what the payer reported to the IRS",
      requirement: "required",
      state: "missing",
    confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "income_mismatch").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "amount_mismatch").map((d) => d.id),
    });
  }

  // ── Bank statements ──
  if (discrepancies.some((d) => d.type === "amount_mismatch")) {
    items.push({
      id: crypto.randomUUID(),
      type: "bank_statement",
      label: `Bank Statements (${extraction.taxYear ?? "tax year"})`,
      purpose: "Shows actual amounts received from the payer",
      requirement: "recommended",
      state: "missing",
    confidence: "unverified",
      supportsFindings: findings.filter((f) => f.type === "income_mismatch").map((f) => f.id),
      supportsDiscrepancies: discrepancies.filter((d) => d.type === "amount_mismatch").map((d) => d.id),
    });
  }

  // ── Corrected information return ──
  if (discrepancies.some((d) => d.type === "amount_mismatch")) {
    items.push({
      id: crypto.randomUUID(),
      type: "corrected_return",
      label: "Corrected Information Return (if applicable)",
      purpose: "If the payer issued a corrected W-2 or 1099 showing different amounts",
      requirement: "optional",
      state: "missing",
    confidence: "unverified",
      supportsFindings: [],
      supportsDiscrepancies: [],
    });
  }

  // ── Prior correspondence with IRS ──
  items.push({
    id: crypto.randomUUID(),
    type: "correspondence",
    label: "Prior IRS Correspondence (if any)",
    purpose: "Shows any previous communications about this issue",
    requirement: "optional",
    state: "missing",
    confidence: "unverified",
    supportsFindings: [],
    supportsDiscrepancies: [],
  });

  // ── Non-taxable documentation ──
  const nonTaxableDiscrepancies = discrepancies.filter((d) => d.type === "non_taxable");
  if (nonTaxableDiscrepancies.length > 0) {
    items.push({
      id: crypto.randomUUID(),
      type: "non_taxable_proof",
      label: "Documentation of Non-Taxable Status",
      purpose: "Shows why the income is not taxable (e.g., distribution codes, form 8606)",
      requirement: "required",
      state: "missing",
    confidence: "unverified",
      supportsFindings: [],
      supportsDiscrepancies: nonTaxableDiscrepancies.map((d) => d.id),
    });
  }

  // ── Identity documentation ──
  const identityDiscrepancies = discrepancies.filter((d) => d.type === "identity_mismatch");
  if (identityDiscrepancies.length > 0) {
    items.push({
      id: crypto.randomUUID(),
      type: "identity_proof",
      label: "Identity Documentation",
      purpose: "Shows the income belongs to a different person",
      requirement: "required",
      state: "missing",
    confidence: "unverified",
      supportsFindings: [],
      supportsDiscrepancies: identityDiscrepancies.map((d) => d.id),
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
