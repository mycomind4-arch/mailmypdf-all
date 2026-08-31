/* ═══════════════════════════════════════════════════════════
   CP14 FINDINGS — CP14-specific finding types using the
   shared Finding model from finding.ts.

   CP14 is a balance due notice (not a proposed change like
   CP2000). Finding types reflect balance/payment/penalty issues.

   ═══════════════════════════════════════════════════════════ */

export {
  createFinding,
  findingSummary,
  resolveFinding,
  type Finding,
  type FindingSeverity,
  type FindingConfidence,
  type ProvenanceRef,
} from "./finding";

// ── CP14-Specific Finding Types ──────────────────────────────

export type CP14FindingType =
  | "balance_dispute"
  | "balance_already_paid"
  | "penalty_error"
  | "interest_error"
  | "duplicate_assessment"
  | "wrong_tax_year"
  | "deadline_risk"
  | "installment_eligible"
  | "abatement_eligible"
  | "classification_warning"
  | "documentation_gap"
  | "missing_info";
