/**
 * CP2000 IRS Notice Response Workflow
 * Type system for IRS Notice of Proposed Adjustment responses
 */

// ─────────────────────────────────────────────────────────────
// EXTRACTION & INTAKE
// ─────────────────────────────────────────────────────────────

export interface ProposedAdjustment {
  id: string;
  category: string; // "Unreported W-2 Income", "Disallowed Expense", etc.
  line_reference: string; // Tax form line (e.g., "1040 Line 1")
  original_amount: number;
  adjustment_amount: number;
  resulting_amount: number;
  confidence: number;
}

export interface CP2000NoticeExtraction {
  deadline_date: string; // YYYY-MM-DD
  deadline_confidence: number;
  deadline_days: number; // 30 or 60
  notice_number: string;
  notice_number_confidence: number;
  notice_issue_date: string;
  notice_issue_date_confidence: number;
  taxpayer_name: string;
  taxpayer_name_confidence: number;
  taxpayer_ssn_masked: string | null; // ###-##-#### format for privacy
  ssn_confidence: number;
  tax_year: number;
  tax_year_confidence: number;
  proposed_adjustments: ProposedAdjustment[];
  adjustments_confidence: number;
  total_additional_tax: number | null;
  total_tax_confidence: number;
  proposed_penalty_amount: number | null;
  penalty_confidence: number;
  irs_contact_info: {
    phone: string | null;
    fax: string | null;
    address: string | null;
  };
  contact_confidence: number;
  is_outside_us_flag: boolean;
  notice_complexity: "simple" | "moderate" | "complex";
  fraud_indicators: string[];
}

export interface CP2000IntakeConfirmation {
  extraction: CP2000NoticeExtraction;
  user_confirmations: Record<string, boolean>;
  user_corrections: Record<string, unknown>;
  confirmed_at: string;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION & ROUTING
// ─────────────────────────────────────────────────────────────

export type CP2000ResponsePath = "agree" | "disagree" | "partial" | "appeal" | "extension" | "escalate-attorney";

export interface CP2000ClassificationRequest {
  intake: CP2000IntakeConfirmation;
  taxpayer_agrees: boolean;
  has_evidence: boolean;
  evidence_types?: string[];
  adjustment_amount: number;
  is_complex: boolean;
  has_prior_audit: boolean;
  deadline_urgent: boolean; // < 5 days
  outside_us: boolean;
}

export interface CP2000ClassificationResult {
  path: CP2000ResponsePath;
  confidence: number;
  reasoning: string;
  hard_stop: boolean;
  hard_stop_reason?: string;
  recommended_strategy: string;
  next_steps: string[];
  risk_level: "low" | "medium" | "high";
  estimated_irs_response_time: string;
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATION
// ─────────────────────────────────────────────────────────────

export interface AgreementResponsePayload {
  intake: CP2000IntakeConfirmation;
  payment_plan_needed: boolean;
  payment_timeline?: string;
}

export interface DisagreementResponsePayload {
  intake: CP2000IntakeConfirmation;
  taxpayer_explanation: string;
  evidence_references: string[];
  disputed_items: string[];
}

export interface PartialAgreementPayload {
  intake: CP2000IntakeConfirmation;
  agreed_items: string[];
  disputed_items: DisputedItem[];
}

export interface DisputedItem {
  adjustment_id: string;
  taxpayer_position: string;
  supporting_evidence: string[];
}

export interface AppealRequestPayload {
  intake: CP2000IntakeConfirmation;
  appeal_reason: string;
  request_independent_review: boolean;
}

export interface ExtensionRequestPayload {
  intake: CP2000IntakeConfirmation;
  reason: "gather_evidence" | "consult_professional" | "clarification";
  requested_days: number;
}

export interface GeneratedDocument {
  type: "agreement-letter" | "disagreement-letter" | "partial-agreement-letter" | "appeal-request" | "extension-request" | "attorney-referral";
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

export interface CP2000Guardrail {
  id: string;
  type:
    | "no-fabricated-deadlines"
    | "no-false-legal-claims"
    | "irs-format-compliance"
    | "attorney-escalation"
    | "fraud-detection"
    | "assumption-flag";
  description: string;
  triggered: boolean;
  message: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  guardrails: CP2000Guardrail[];
  warnings: string[];
  assumptions_flagged: string[];
  fraud_risk_level: number; // 0-1
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW STATE
// ─────────────────────────────────────────────────────────────

export interface CP2000WorkflowState {
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
    | "signed"
    | "submitted"
    | "completed"
    | "escalated";
  extraction: CP2000NoticeExtraction | null;
  confirmation: CP2000IntakeConfirmation | null;
  classification: CP2000ClassificationResult | null;
  selected_path: CP2000ResponsePath | null;
  generated_documents: GeneratedDocument[];
  compliance: ComplianceCheckResult | null;
  evidence_gathered: {
    documents: Array<{ type: string; description: string; url: string }>;
    user_explanation: string;
  } | null;
  user_decisions: Record<string, unknown>;
  submission_info: {
    method: "mail" | "fax" | "irs-digital" | "pending";
    submitted_at?: string;
    confirmation_number?: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// JURISDICTION REFERENCE DATA
// ─────────────────────────────────────────────────────────────

export interface IRSReferenceData {
  country: "US";
  outside_us_deadline_days: 60;
  domestic_deadline_days: 30;
  penalty_rate: 0.2; // 20% accuracy-related
  statute_of_limitations: 3;
  tax_court_deadline_days: 90;
  tax_court_deadline_days_outside_us: 150;
  appeals_office_response_days: 120;
  irs_publication_references: string[];
}
