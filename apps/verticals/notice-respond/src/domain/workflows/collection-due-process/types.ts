/**
 * Collection Due Process (CDP) Notice Response Workflow
 * Type system for IRS notice of intent to levy responses
 */

// ─────────────────────────────────────────────────────────────
// EXTRACTION & INTAKE
// ─────────────────────────────────────────────────────────────

export interface TaxDebtItem {
  id: string;
  tax_type: string; // "Income Tax", "Payroll Tax", "Self-Employment Tax", etc.
  tax_year: number;
  amount_owed: number;
  assessed_date: string; // YYYY-MM-DD
  payment_status: "unpaid" | "partially-paid" | "in-payment-plan";
}

export interface LevyThreats {
  levy_types: string[]; // "Wage levy", "Bank levy", "Property levy", etc.
  specific_assets_named?: string[];
  employer_name?: string; // If wage levy threatened
  bank_routing_number?: string; // If bank levy threatened
}

export interface CDPNoticeExtraction {
  notice_date: string; // YYYY-MM-DD
  notice_date_confidence: number;
  notice_type: "CDP" | "NFTL"; // Collection Due Process or Notice of Federal Tax Lien
  notice_type_confidence: number;
  notice_number: string;
  notice_number_confidence: number;
  taxpayer_name: string;
  taxpayer_name_confidence: number;
  taxpayer_ssn_masked: string | null;
  ssn_confidence: number;
  address: string | null;
  address_confidence: number;
  response_deadline: string; // YYYY-MM-DD (30 days from notice)
  deadline_confidence: number;
  total_tax_debt: number;
  tax_debt_confidence: number;
  tax_debt_items: TaxDebtItem[];
  tax_debt_detail_confidence: number;
  penalties_and_interest: number | null;
  penalties_interest_confidence: number;
  total_amount_due: number | null;
  total_amount_confidence: number;
  current_payment_status: "no-payments" | "in-payment-plan" | "payments-late" | "bankruptcy";
  payment_status_confidence: number;
  levy_threats: LevyThreats;
  levy_confidence: number;
  collection_activity_history: string | null;
  collection_history_confidence: number;
  prior_cdp_request: boolean;
  prior_cdp_confidence: number;
  bankruptcy_reference: boolean;
  bankruptcy_reference_confidence: number;
  irs_contact_info: {
    phone: string | null;
    address: string | null;
    employee_id: string | null;
  };
  contact_confidence: number;
  is_business_taxpayer: boolean;
  is_joint_return: boolean;
  is_deceased_taxpayer: boolean;
  notice_complexity: "simple" | "moderate" | "complex";
}

export interface CDPIntakeConfirmation {
  extraction: CDPNoticeExtraction;
  user_confirmations: Record<string, boolean>;
  user_corrections: Record<string, unknown>;
  confirmed_at: string;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION & ROUTING
// ─────────────────────────────────────────────────────────────

export type CDPResponsePath =
  | "setup-payment-plan"
  | "request-currently-not-collectible"
  | "request-offer-in-compromise"
  | "dispute-liability"
  | "request-lien-withdrawal"
  | "levy-hardship-relief"
  | "escalate-attorney"
  | "bankruptcy-protection";

export interface CDPClassificationRequest {
  intake: CDPIntakeConfirmation;
  can_pay_full: boolean;
  can_pay_partial: boolean;
  payment_capability: number; // Estimated monthly payment ability
  financial_hardship: boolean;
  disputes_liability: boolean;
  liability_basis?: string; // Why disputes liability
  has_prior_cdp: boolean;
  in_bankruptcy: boolean;
  bankruptcy_chapter?: "7" | "11" | "13";
  has_valid_defense: boolean;
  employer_status?: "employed" | "self-employed" | "retired";
}

export interface CDPClassificationResult {
  path: CDPResponsePath;
  confidence: number;
  reasoning: string;
  hard_stop: boolean;
  hard_stop_reason?: string;
  recommended_strategy: string;
  next_steps: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  levy_threat_level: "imminent" | "likely" | "possible";
  estimated_levy_timeline: string;
  estimated_irs_response_time: string;
  critical_warnings: string[];
  levy_prevention_strategies: string[];
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATION
// ─────────────────────────────────────────────────────────────

export interface PaymentPlanProposalPayload {
  intake: CDPIntakeConfirmation;
  monthly_payment: number;
  duration_months: number;
  first_payment_date: string;
  payment_method: "check" | "eft" | "credit-card";
}

export interface NotCurrentlyCollectiblePayload {
  intake: CDPIntakeConfirmation;
  financial_hardship_reason: string;
  monthly_income: number;
  monthly_expenses: number;
  supporting_documentation: string[];
  expected_hardship_duration: string;
}

export interface OfferInCompromisePayload {
  intake: CDPIntakeConfirmation;
  offer_amount: number;
  offer_basis: string; // "Doubt as to collectibility", "Hazards of litigation", etc.
  supporting_evidence: string[];
  financial_summary: string;
}

export interface LiabilityDisputePayload {
  intake: CDPIntakeConfirmation;
  dispute_reason: string;
  disputed_tax_years: number[];
  legal_arguments: string[];
  supporting_evidence: string[];
}

export interface LienWithdrawalPayload {
  intake: CDPIntakeConfirmation;
  withdrawal_basis: string;
  taxpayer_commitment: string;
  supporting_documentation: string[];
}

export interface LevyHardshipReliefPayload {
  intake: CDPIntakeConfirmation;
  hardship_reason: string;
  levy_impact_explanation: string;
  financial_documentation: string[];
  alternative_payment_proposal: string;
}

export interface GeneratedDocument {
  type:
    | "payment-plan-proposal"
    | "currently-not-collectible-request"
    | "offer-in-compromise"
    | "liability-dispute"
    | "lien-withdrawal-request"
    | "levy-hardship-relief"
    | "bankruptcy-notice"
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

export interface CDPGuardrail {
  id: string;
  type:
    | "critical-deadline"
    | "levy-prevention"
    | "bankruptcy-stay"
    | "no-fabricated-claims"
    | "attorney-escalation"
    | "assumption-flag"
    | "asset-protection";
  description: string;
  triggered: boolean;
  message: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  guardrails: CDPGuardrail[];
  warnings: string[];
  assumptions_flagged: string[];
  levy_risk_level: number; // 0-1
  days_until_levy: number;
  critical_deadlines: Array<{ event: string; date: string; days_remaining: number }>;
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW STATE
// ─────────────────────────────────────────────────────────────

export interface CDPWorkflowState {
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
    | "submitted"
    | "levy-prevention"
    | "payment-arrangement"
    | "completed"
    | "escalated";
  extraction: CDPNoticeExtraction | null;
  confirmation: CDPIntakeConfirmation | null;
  classification: CDPClassificationResult | null;
  selected_path: CDPResponsePath | null;
  generated_documents: GeneratedDocument[];
  compliance: ComplianceCheckResult | null;
  financial_documentation: {
    documents: Array<{ type: string; description: string; url: string }>;
    monthly_income: number | null;
    monthly_expenses: number | null;
  } | null;
  user_decisions: Record<string, unknown>;
  submission_info: {
    method: "mail" | "electronic" | "in-person" | "pending";
    submitted_date?: string;
    confirmation_number?: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// JURISDICTION REFERENCE DATA
// ─────────────────────────────────────────────────────────────

export interface CDPReferenceData {
  country: "US";
  response_deadline_days: 30; // IRC § 6330
  response_deadline_days_from_lien_date: 30; // IRC § 6320
  levy_minimum_notice: 30; // Days notice required
  wage_levy_minimum_exempt: number; // Standard deduction amount
  bankruptcy_automatic_stay: true; // Automatic upon filing
  bankruptcy_chapter_7_timeline: "3-6 months";
  bankruptcy_chapter_13_timeline: "3-5 years";
  offer_in_compromise_fee: number; // Typically $225-$225
  currently_not_collectible_duration: "12-24 months"; // Reviewed period
  statute_of_limitations_cdp: 10; // Years to collect from assessment
  cdp_appeals_deadline_days: 30; // From CDP notice
  irs_manual_references: string[];
}
