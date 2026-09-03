/**
 * Eviction Notice Response Workflow
 * Complete type system for 3-day notice to pay/quit (California)
 */

// ─────────────────────────────────────────────────────────────
// EXTRACTION & INTAKE
// ─────────────────────────────────────────────────────────────

export interface EvictionNoticeExtraction {
  deadline_date: string; // YYYY-MM-DD
  deadline_confidence: number; // 0-1
  notice_amount_owed: number | null;
  amount_confidence: number;
  notice_issuer: string;
  issuer_confidence: number;
  property_address: string;
  address_confidence: number;
  jurisdiction: {
    state: "CA";
    county: string;
    city?: string;
  };
  jurisdiction_confidence: number;
  notice_issue_date: string;
  notice_service_date: string | null;
  tenant_name: string;
  prior_correspondence: string | null;
  notice_type: "3day-pay" | "3day-cure" | "unconditional-quit" | "unknown";
  type_confidence: number;
}

export interface EvictionIntakeConfirmation {
  extraction: EvictionNoticeExtraction;
  user_confirmations: Record<keyof EvictionNoticeExtraction, boolean>;
  confirmed_at: string;
}

// ─────────────────────────────────────────────────────────────
// CLASSIFICATION & ROUTING
// ─────────────────────────────────────────────────────────────

export type EvictionResponsePath =
  | "pay-negotiate"
  | "contest-defend"
  | "move-preparation"
  | "escalate-attorney"
  | "payment-already-made"
  | "deadline-passed";

export interface EvictionClassificationRequest {
  intake: EvictionIntakeConfirmation;
  can_pay: boolean;
  payment_amount?: number;
  has_defenses: boolean;
  defense_types?: string[];
  tenant_status: "current" | "former" | "unauthorized";
  language_barrier?: boolean;
  prior_eviction?: boolean;
  court_involvement?: boolean;
}

export interface EvictionClassificationResult {
  path: EvictionResponsePath;
  confidence: number;
  reasoning: string;
  hard_stop: boolean;
  hard_stop_reason?: string;
  recommended_strategy: string;
  next_steps: string[];
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT GENERATION
// ─────────────────────────────────────────────────────────────

export interface PaymentProposalPayload {
  intake: EvictionIntakeConfirmation;
  payment_option: "full" | "partial" | "extension";
  payment_date?: string;
  monthly_payment?: number;
  months_to_pay?: number;
  tenant_statement?: string;
}

export interface ContestDefensePayload {
  intake: EvictionIntakeConfirmation;
  defenses: DefenseType[];
  defense_details: Record<DefenseType, string>;
  evidence_list?: string[];
  tenant_statement?: string;
}

export type DefenseType =
  | "habitability"
  | "procedural-defect"
  | "retaliation"
  | "payment-made"
  | "waiver"
  | "fraud-mistake"
  | "other";

export interface GeneratedDocument {
  type: "payment-letter" | "contest-letter" | "declaration" | "proof-of-service";
  title: string;
  content: string;
  markdown_content: string;
  requires_signature: boolean;
  requires_notary: boolean;
  generated_at: string;
  model_used: string;
  provider: "claude" | "gemini" | "openai";
}

// ─────────────────────────────────────────────────────────────
// GUARDRAILS & COMPLIANCE
// ─────────────────────────────────────────────────────────────

export interface EvictionGuardrail {
  id: string;
  type:
    | "no-auto-send"
    | "no-fabricated-facts"
    | "legal-disclaimer"
    | "attorney-escalation"
    | "assumption-flag"
    | "statute-verification";
  description: string;
  triggered: boolean;
  message: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  guardrails: EvictionGuardrail[];
  warnings: string[];
  assumptions_flagged: string[];
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW STATE
// ─────────────────────────────────────────────────────────────

export interface EvictionWorkflowState {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  status:
    | "intake"
    | "confirmation"
    | "classification"
    | "drafting"
    | "review"
    | "signed"
    | "mailed"
    | "completed"
    | "escalated";
  extraction: EvictionNoticeExtraction | null;
  confirmation: EvictionIntakeConfirmation | null;
  classification: EvictionClassificationResult | null;
  selected_path: EvictionResponsePath | null;
  generated_documents: GeneratedDocument[];
  compliance: ComplianceCheckResult | null;
  user_decisions: Record<string, unknown>;
  mailing_info: {
    method: "usps-standard" | "usps-certified" | "hand-delivery" | "email";
    recipient_address?: string;
    sent_at?: string;
    tracking_number?: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// JURISDICTION REFERENCE DATA
// ─────────────────────────────────────────────────────────────

export interface JurisdictionData {
  state: "CA";
  county: string;
  city?: string;
  response_deadline_days: number;
  statute_citations: string[];
  local_protections?: string[];
  legal_aid_resources: string[];
}
