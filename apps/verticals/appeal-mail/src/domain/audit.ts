/* ═══════════════════════════════════════════════════════════
   AUDIT TRAIL — event-based audit logging for the appeal
   workflow. Adapted from Notice Respond's audit module.

   Every significant action in the workflow is recorded as an
   AuditEvent. This provides:
   - accountability (who did what, when)
   - traceability (what the system analyzed and concluded)
   - transparency (user can see what happened)
   - security (evidence of what was sent and when)

   ═══════════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────────────

export type AuditEventType =
  | "appeal_created"
  | "document_uploaded"
  | "document_classified"
  | "extraction_completed"
  | "xray_completed"
  | "timeline_built"
  | "ground_added"
  | "ground_confirmed"
  | "evidence_uploaded"
  | "evidence_linked"
  | "argument_constructed"
  | "stress_test_completed"
  | "strategy_generated"
  | "draft_generated"
  | "draft_validated"
  | "readiness_reviewed"
  | "packet_assembled"
  | "recipient_set"
  | "mailing_selected"
  | "checkout_started"
  | "checkout_completed"
  | "mailing_submitted"
  | "mailing_failed"
  | "proof_generated"
  | "appeal_archived";

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  appeal_created: "Appeal Created",
  document_uploaded: "Document Uploaded",
  document_classified: "Document Classified",
  extraction_completed: "Extraction Completed",
  xray_completed: "X-Ray Analysis Completed",
  timeline_built: "Timeline Built",
  ground_added: "Appeal Ground Added",
  ground_confirmed: "Appeal Ground Confirmed",
  evidence_uploaded: "Evidence Uploaded",
  evidence_linked: "Evidence Linked",
  argument_constructed: "Argument Constructed",
  stress_test_completed: "Stress Test Completed",
  strategy_generated: "Strategy Generated",
  draft_generated: "Draft Generated",
  draft_validated: "Draft Validated",
  readiness_reviewed: "Readiness Reviewed",
  packet_assembled: "Packet Assembled",
  recipient_set: "Recipient Set",
  mailing_selected: "Mailing Method Selected",
  checkout_started: "Checkout Started",
  checkout_completed: "Checkout Completed",
  mailing_submitted: "Mailing Submitted",
  mailing_failed: "Mailing Failed",
  proof_generated: "Proof Generated",
  appeal_archived: "Appeal Archived",
};

export interface AuditEvent {
  id: string;
  appealId: string;
  type: AuditEventType;
  timestamp: string;
  userId?: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

// ── Audit Log ────────────────────────────────────────────────

export class AuditLog {
  private events: AuditEvent[] = [];

  constructor(private appealId: string) {}

  log(
    type: AuditEventType,
    detail: string,
    metadata?: Record<string, unknown>,
    userId?: string,
  ): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      appealId: this.appealId,
      type,
      timestamp: new Date().toISOString(),
      detail,
      metadata,
      userId,
    };
    this.events.push(event);
    return event;
  }

  getAll(): AuditEvent[] {
    return [...this.events].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getByType(type: AuditEventType): AuditEvent[] {
    return this.getAll().filter((e) => e.type === type);
  }

  getChronological(): AuditEvent[] {
    return [...this.events].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  count(): number {
    return this.events.length;
  }

  hasEvent(type: AuditEventType): boolean {
    return this.events.some((e) => e.type === type);
  }

  getSummary(): { type: AuditEventType; label: string; count: number }[] {
    const counts = new Map<AuditEventType, number>();
    for (const event of this.events) {
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      label: AUDIT_EVENT_LABELS[type],
      count,
    }));
  }

  clear(): void {
    this.events = [];
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createAuditLog(appealId: string): AuditLog {
  return new AuditLog(appealId);
}
