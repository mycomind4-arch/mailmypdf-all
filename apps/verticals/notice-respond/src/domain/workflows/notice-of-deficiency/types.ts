/**
 * Notice of Deficiency (90-Day Letter) Response Workflow
 * Type system for IRS deficiency notice responses
 */

// ─────────────────────────────────────────────────────────────
// EXTRACTION & INTAKE
// ─────────────────────────────────────────────────────────────

export interface TaxAdjustmentLine {
  id: string;
  year: number;
  form_line: string; // e.g., "1040 Line 1", "Schedule C Line 12"
  item_description: string;
  reported_amount: number;
  proposed_amount: number;
  adjustment: number;
  category: string; // "Income", "Deduction", "Credit", etc.
  confidence: number;
}

export interface DeficiencyCalculation {
  tax_year: number;
  original_tax: number;
  adjusted_tax: number;
  deficiency_amount: number; // adjusted_tax - original_tax
  interest_estimated: number | null;
  penalty_estimated: number | null;
  total_amount_due: number | null;
  calculation_confidence: number;
}

export interface NoticeOfDeficiencyExtraction {
  notice_date: string; // YYYY-MM-DD
  notice_date_confidence: number;
  deficiency_notice_number: string;
  deficiency_notice_confidence: number;
  tax_year: number;
  tax_year_confidence: number;
  taxpayer_name: string;
  taxpayer_name_confidence: number;
  taxpayer_ssn_masked: string | null; // ###-##-#### format
  ssn_confidence: number;
  address: string | null;
  address_confidence: number;
  deficiency_amount: number;
  deficiency_confidence: number;
  interest_amount: number | null;
  interest_confidence: number;
  penalty_amount: number | null;
  penalty_confidence: number;
  total_amount_due: number | null;
  total_amount_confidence: number;
  tax_adjustment_lines: TaxAdjustmentLine[];
  deficiency_calculations: DeficiencyCalculation[];
  calculation_method: string; // Description of how deficiency was calculated
  irs_contact_info: {
    phone: string | null;
    mailing_address: string | null;
    tax_court_address: string | null;
  };
  contact_confidence: number;
  statutory_notice_deadline: string; // YYYY-MM-DD (90 days from notice date)
  deadline_confidence: number;
  prior_examination_reference: string | null; // Reference to CP2000 or prior notice
  examination_history_confidence: number;
  fraud_indicators: string[];
  notice_complexity: "simple" | "moderate" | "complex";
  is_joint_return: boolean;
  is_outside_us_flag: boolean;
}

export interface DeficiencyIntakeConfirmation {
  extraction: NoticeOfDeficiencyExtraction;
  user_confirmations: Record<string, boolean>;
  user_corrections: Record<string, unknown>;
  confirmed_at: string;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION & ROUTING
// ─────────────────────────────────────────────────────────────

export type DeficiencyResponsePath =
  | "agree"
  | "disagree-and-petition"
  | "payment-plan"
  | "tax-court-petition"
  | "settlement"
  | "innocent-spouse"
  | "collection-alternative"
  | "escalate-attorney";

export interface DeficiencyClassificationRequest {
  intake: DeficiencyIntakeConfirmation;
  taxpayer_agrees: boolean;
  has_evidence: boolean;
  evidence_types?: string[];
  deficiency_amount: number;
  can_pay_full: boolean;
  payment_timeline?: string;
  wants_tax_court: boolean;
  is_joint_return: boolean;
  has_prior_audit: boolean;
  hardship_situation: boolean;
  has_fraud_allegations: boolean;
}

export interface DeficiencyClassificationResult {
  path: DeficiencyResponsePath;
  confidence: number;
  reasoning: string;
  hard_stop: boolean;
  hard_stop_reason?: string;
  recommended_strategy: string;
  next_steps: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  tax_court_deadline: string; // ISO date
  tax_court_filing_deadline_days: number; // Days remaining
  estimated_irs_response_time: string;
  critical_warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATION
// ─────────────────────────────────────────────────────────────

export interface AgreementResponsePayload {
  intake: DeficiencyIntakeConfirmation;
  payment_plan_needed: boolean;
  payment_timeline?: string;
  explanation?: string;
}

export interface DisagreementResponsePayload {
  intake: DeficiencyIntakeConfirmation;
  taxpayer_explanation: string;
  evidence_references: string[];
  disputed_lines: string[]; // IDs of disputed adjustment lines
  legal_authority_citations: string[];
}

export interface TaxCourtPetitionPayload {
  intake: DeficiencyIntakeConfirmation;
  petition_reason: string;
  requested_relief: string;
  supporting_arguments: string[];
}

export interface PaymentPlanPayload {
  intake: DeficiencyIntakeConfirmation;
  monthly_payment: number;
  duration_months: number;
  first_payment_date: string; // YYYY-MM-DD
  hardship_basis?: string;
}

export interface SettlementProposalPayload {
  intake: DeficiencyIntakeConfirmation;
  settlement_amount: number;
  settlement_basis: string; // "Hazards of litigation", "Nuisance settlement", etc.
  reasoning: string;
}

export interface InnocentSpousePayload {
  intake: DeficiencyIntakeConfirmation;
  requesting_spouse_name: string;
  requesting_spouse_ssn: string;
  other_spouse_name: string;
  item_causing_liability: string;
  did_not_know_reason: string;
  failure_to_pay_basis: string;
}

export interface GeneratedDocument {
  type:
    | "agreement-response"
    | "disagreement-response"
    | "tax-court-petition"
    | "payment-plan-request"
    | "settlement-proposal"
    | "innocent-spouse-claim"
    | "attorney-referral";
  title: string;
  content: string;
  markdown_content: string;
  requires_signature: boolean;
  is_official_form: boolean;
  generated_at: string;
  model_used: string;
  provider: "claude" | "gemini" | "openai";
}

// ─────────────────────────────────────────────────────────────
// GUARDRAILS & COMPLIANCE
// ─────────────────────────────────────────────────────────────

export interface DeficiencyGuardrail {
  id: string;
  type:
    | "critical-deadline"
    | "tax-court-jurisdiction"
    | "no-fabricated-defenses"
    | "attorney-escalation"
    | "fraud-detection"
    | "assumption-flag"
    | "innocent-spouse-eligibility"
    | "joint-return-rules";
  description: string;
  triggered: boolean;
  message: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  guardrails: DeficiencyGuardrail[];
  warnings: string[];
  assumptions_flagged: string[];
  fraud_risk_level: number; // 0-1
  critical_deadlines: Array<{ event: string; date: string; days_remaining: number }>;
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW STATE
// ─────────────────────────────────────────────────────────────

export interface DeficiencyWorkflowState {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  status:
    | "intake"
    | "confirmation"
    | "classification"
    | "evidence_gathering"
    | "drafting"
    | "review"
    | "filed"
    | "tax-court-filed"
    | "payment-initiated"
    | "completed"
    | "escalated";
  extraction: NoticeOfDeficiencyExtraction | null;
  confirmation: DeficiencyIntakeConfirmation | null;
  classification: DeficiencyClassificationResult | null;
  selected_path: DeficiencyResponsePath | null;
  generated_documents: GeneratedDocument[];
  compliance: ComplianceCheckResult | null;
  evidence_gathered: {
    documents: Array<{ type: string; description: string; url: string }>;
    user_explanation: string;
  } | null;
  user_decisions: Record<string, unknown>;
  filing_info: {
    method: "mail" | "electronic" | "tax-court-efiling" | "pending";
    filed_date?: string;
    filing_confirmation_number?: string;
    tax_court_petition_filed?: boolean;
    petition_docket_number?: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// JURISDICTION REFERENCE DATA
// ─────────────────────────────────────────────────────────────

export interface DeficiencyReferenceData {
  country: "US";
  statutory_notice_period_days: 90; // IRC § 6213(a)
  statutory_notice_period_days_outside_us: 150; // IRC § 6213(d)
  tax_court_petition_deadline_days: 90; // Must file within 90 days of notice
  tax_court_petition_deadline_days_outside_us: 150; // IRC § 6213(d)
  interest_rate: number; // Updated quarterly
  penalty_accuracy_related: 0.2; // 20%
  statute_of_limitations: 3; // Years (can be 6 years for 25%+ underreporting, unlimited for fraud)
  appeals_deadline_days: 120; // From notice date (alternative to Tax Court)
  collection_due_process_notice_days: 30; // If notice of intent to levy issued
  innocent_spouse_deadline_days: 14; // 14 days from IRS request (generally)
  bankruptcy_automatic_stay: true;
  irs_manual_references: string[];
}
