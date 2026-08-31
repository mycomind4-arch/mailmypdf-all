/* ═══════════════════════════════════════════════════════════
   CP2000 FINDINGS — CP2000-specific finding types using the
   shared Finding model from finding.ts.

   Domain-specific finding types remain here. The generic
   Finding structure (supportingFacts, confidence, severity,
   provenance) is shared.

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

// ── CP2000-Specific Finding Types ────────────────────────────

export type CP2000FindingType =
  | "income_mismatch"
  | "duplicate_income"
  | "wrong_tax_year"
  | "already_reported"
  | "non_taxable_item"
  | "missing_deduction"
  | "identity_mismatch"
  | "documentation_gap"
  | "deadline_risk"
  | "penalty_assessment"
  | "proposed_change"
  | "missing_info"
  | "classification_warning";
