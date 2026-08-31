/**
 * CP2000 Workflow State Machine — durable, server-authoritative states.
 *
 * Legal transitions are enforced. No skipping from draft to mailed.
 * No mailing without verified approval and payment.
 *
 * States:
 *   created → document_uploaded → document_processed → classified → analyzed
 *   → facts_confirmed → evidence_review → draft_ready → draft_review
 *   → approved → payment_pending → paid → fulfillment_pending
 *   → mailed → tracking → delivered → proof_finalized
 *
 * Error recovery states:
 *   extraction_failed → (retry → document_uploaded)
 *   payment_failed → (retry → approved)
 *   fulfillment_failed → (retry → paid)
 */

export type WorkflowState =
  | "created"
  | "document_uploaded"
  | "document_processed"
  | "classified"
  | "analyzed"
  | "facts_confirmed"
  | "evidence_review"
  | "draft_ready"
  | "draft_review"
  | "approved"
  | "payment_pending"
  | "paid"
  | "fulfillment_pending"
  | "mailed"
  | "tracking"
  | "delivered"
  | "proof_finalized"
  // Error states
  | "extraction_failed"
  | "payment_failed"
  | "fulfillment_failed"
  | "classification_uncertain";

export interface StateTransition {
  from: WorkflowState;
  to: WorkflowState;
  timestamp: string;
  actor: "user" | "system" | "provider";
  reason?: string;
}

// ── Legal transitions ────────────────────────────────────────

const LEGAL_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  created: ["document_uploaded", "extraction_failed"],
  document_uploaded: ["document_processed", "extraction_failed"],
  document_processed: ["classified", "classification_uncertain", "extraction_failed"],
  classified: ["analyzed"],
  classification_uncertain: ["classified", "document_uploaded"],
  analyzed: ["facts_confirmed"],
  facts_confirmed: ["evidence_review"],
  evidence_review: ["draft_ready"],
  draft_ready: ["draft_review"],
  draft_review: ["approved", "draft_ready"],
  approved: ["payment_pending", "payment_failed"],
  payment_pending: ["paid", "payment_failed"],
  payment_failed: ["payment_pending", "approved"],
  paid: ["fulfillment_pending", "fulfillment_failed"],
  fulfillment_pending: ["mailed", "fulfillment_failed"],
  fulfillment_failed: ["fulfillment_pending", "paid"],
  mailed: ["tracking"],
  tracking: ["delivered", "mailed"],
  delivered: ["proof_finalized"],
  proof_finalized: [],
  extraction_failed: ["document_uploaded", "created"],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  const allowed = LEGAL_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function transition(
  from: WorkflowState,
  to: WorkflowState,
  actor: "user" | "system" | "provider" = "system",
  reason?: string,
): { state: WorkflowState; transition: StateTransition | null; error?: string } {
  if (!canTransition(from, to)) {
    return {
      state: from,
      transition: null,
      error: `Illegal transition: ${from} → ${to}`,
    };
  }

  return {
    state: to,
    transition: {
      from,
      to,
      timestamp: new Date().toISOString(),
      actor,
      reason,
    },
  };
}

// ── State metadata ────────────────────────────────────────────

export interface StateMeta {
  label: string;
  description: string;
  isTerminal: boolean;
  isError: boolean;
  isBlocking: boolean;
}

export const STATE_METADATA: Record<WorkflowState, StateMeta> = {
  created: { label: "Created", description: "Case created", isTerminal: false, isError: false, isBlocking: false },
  document_uploaded: { label: "Document Uploaded", description: "Notice document uploaded", isTerminal: false, isError: false, isBlocking: false },
  document_processed: { label: "Document Processed", description: "Text extracted from document", isTerminal: false, isError: false, isBlocking: false },
  classified: { label: "Classified", description: "Notice type confirmed", isTerminal: false, isError: false, isBlocking: false },
  classification_uncertain: { label: "Classification Uncertain", description: "Could not confidently confirm notice type", isTerminal: false, isError: true, isBlocking: true },
  analyzed: { label: "Analyzed", description: "Discrepancy analysis complete", isTerminal: false, isError: false, isBlocking: false },
  facts_confirmed: { label: "Facts Confirmed", description: "User facts entered", isTerminal: false, isError: false, isBlocking: false },
  evidence_review: { label: "Evidence Review", description: "Evidence checklist reviewed", isTerminal: false, isError: false, isBlocking: false },
  draft_ready: { label: "Draft Ready", description: "Response draft generated", isTerminal: false, isError: false, isBlocking: false },
  draft_review: { label: "Draft Review", description: "Draft under human review", isTerminal: false, isError: false, isBlocking: false },
  approved: { label: "Approved", description: "Draft approved by user", isTerminal: false, isError: false, isBlocking: false },
  payment_pending: { label: "Payment Pending", description: "Stripe checkout initiated", isTerminal: false, isError: false, isBlocking: false },
  paid: { label: "Paid", description: "Payment verified", isTerminal: false, isError: false, isBlocking: false },
  payment_failed: { label: "Payment Failed", description: "Payment did not complete", isTerminal: false, isError: true, isBlocking: true },
  fulfillment_pending: { label: "Fulfillment Pending", description: "Mailing submitted to MailMyPDF", isTerminal: false, isError: false, isBlocking: false },
  fulfillment_failed: { label: "Fulfillment Failed", description: "Mailing submission failed", isTerminal: false, isError: true, isBlocking: true },
  mailed: { label: "Mailed", description: "Letter mailed via MailMyPDF", isTerminal: false, isError: false, isBlocking: false },
  tracking: { label: "In Transit", description: "Tracking number assigned", isTerminal: false, isError: false, isBlocking: false },
  delivered: { label: "Delivered", description: "Delivery confirmed", isTerminal: false, isError: false, isBlocking: false },
  proof_finalized: { label: "Proof Finalized", description: "Complete mailing record archived", isTerminal: true, isError: false, isBlocking: false },
  extraction_failed: { label: "Extraction Failed", description: "Document extraction failed", isTerminal: false, isError: true, isBlocking: true },
};

// ── Audit events ─────────────────────────────────────────────

export interface AuditEventV2 {
  event: string;
  state: WorkflowState;
  timestamp: string;
  data?: Record<string, unknown>;
}

export const AUDIT_EVENTS = {
  WORKFLOW_STARTED: "workflow_started",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_PROCESSED: "document_processed",
  CLASSIFICATION_COMPLETED: "classification_completed",
  ANALYSIS_COMPLETED: "analysis_completed",
  FACTS_CONFIRMED: "facts_confirmed",
  EVIDENCE_ADDED: "evidence_added",
  EVIDENCE_REMOVED: "evidence_removed",
  DRAFT_GENERATED: "draft_generated",
  DRAFT_CHANGED: "draft_changed",
  DRAFT_VALIDATED: "draft_validated",
  REVIEW_COMPLETED: "review_completed",
  DRAFT_APPROVED: "draft_approved",
  PAYMENT_STARTED: "payment_started",
  PAYMENT_VERIFIED: "payment_verified",
  MAILING_SUBMITTED: "mailing_submitted",
  TRACKING_RECEIVED: "tracking_received",
  DELIVERY_CONFIRMED: "delivery_confirmed",
  PROOF_FINALIZED: "proof_finalized",
} as const;

export function createAuditEvent(
  event: string,
  state: WorkflowState,
  data?: Record<string, unknown>,
): AuditEventV2 {
  return {
    event,
    state,
    timestamp: new Date().toISOString(),
    data,
  };
}
