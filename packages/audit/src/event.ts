export type AuditEventType =
  | "matter_created"
  | "document_uploaded"
  | "document_classified"
  | "extraction_completed"
  | "analysis_completed"
  | "timeline_built"
  | "finding_added"
  | "finding_confirmed"
  | "evidence_uploaded"
  | "evidence_linked"
  | "argument_constructed"
  | "stress_test_completed"
  | "strategy_generated"
  | "draft_generated"
  | "draft_validated"
  | "readiness_reviewed"
  | "form_attached"
  | "packet_assembled"
  | "packet_approved"
  | "recipient_set"
  | "mailing_selected"
  | "checkout_started"
  | "checkout_completed"
  | "mailing_submitted"
  | "mailing_failed"
  | "proof_generated"
  | "notification_sent"
  | "matter_archived"
  | "custom";

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  matter_created: "Matter Created",
  document_uploaded: "Document Uploaded",
  document_classified: "Document Classified",
  extraction_completed: "Extraction Completed",
  analysis_completed: "Analysis Completed",
  timeline_built: "Timeline Built",
  finding_added: "Finding Added",
  finding_confirmed: "Finding Confirmed",
  evidence_uploaded: "Evidence Uploaded",
  evidence_linked: "Evidence Linked",
  argument_constructed: "Argument Constructed",
  stress_test_completed: "Stress Test Completed",
  strategy_generated: "Strategy Generated",
  draft_generated: "Draft Generated",
  draft_validated: "Draft Validated",
  readiness_reviewed: "Readiness Reviewed",
  form_attached: "Official Form Attached",
  packet_assembled: "Packet Assembled",
  packet_approved: "Packet Approved",
  recipient_set: "Recipient Set",
  mailing_selected: "Mailing Method Selected",
  checkout_started: "Checkout Started",
  checkout_completed: "Checkout Completed",
  mailing_submitted: "Mailing Submitted",
  mailing_failed: "Mailing Failed",
  proof_generated: "Proof Generated",
  notification_sent: "Notification Sent",
  matter_archived: "Matter Archived",
  custom: "Custom Event",
};

export type AuditActor = {
  type: "user" | "system" | "provider" | "admin";
  id?: string;
  label?: string;
};

export type AuditArtifactRef = {
  kind: "document" | "analysis" | "draft" | "form" | "packet" | "approval" | "order" | "mailing" | "proof" | "other";
  id: string;
  sha256?: string;
};

export type AuditEvent = {
  id: string;
  ownerId: string;
  matterId: string;
  workflowId: string;
  verticalId?: string;
  type: AuditEventType;
  timestamp: string;
  actor: AuditActor;
  detail: string;
  metadata?: Readonly<Record<string, unknown>>;
  artifacts?: readonly AuditArtifactRef[];
};

export type CreateAuditEventInput = Omit<AuditEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  if (!input.ownerId.trim()) throw new Error("Audit events require an ownerId.");
  if (!input.matterId.trim()) throw new Error("Audit events require a matterId.");
  if (!input.workflowId.trim()) throw new Error("Audit events require a workflowId.");
  if (!input.detail.trim()) throw new Error("Audit events require detail.");

  return Object.freeze({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    actor: Object.freeze({ ...input.actor }),
    metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
    artifacts: input.artifacts?.map((artifact) => Object.freeze({ ...artifact })),
  });
}
