/* ═══════════════════════════════════════════════════════════
   CP523 FINDINGS — CP523-specific finding types using the
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

// ── CP523-Specific Finding Types ────────────────────────────

export type CP523FindingType =
  | "payment_mismatch"
  | "wrong_default_reason"
  | "balance_dispute"
  | "installment_agreement_dispute"
  | "documentation_gap"
  | "deadline_risk"
  | "levy_risk"
  | "passport_certification_warning"
  | "proposed_termination"
  | "missing_info"
  | "classification_warning";
