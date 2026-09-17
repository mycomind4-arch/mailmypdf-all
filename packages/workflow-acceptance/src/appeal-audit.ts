/* Event-based audit trail promoted from the legacy Appeal Mail domain layer. */

export type AppealAuditEventType =
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

// Compatibility alias for callers migrating from the old Appeal Mail domain.
export type AuditEventType = AppealAuditEventType;

export const APPEAL_AUDIT_EVENT_LABELS: Record<AppealAuditEventType, string> = {
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

export const AUDIT_EVENT_LABELS = APPEAL_AUDIT_EVENT_LABELS;

export interface AppealAuditEvent {
  id: string;
  appealId: string;
  type: AppealAuditEventType;
  timestamp: string;
  userId?: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

export type AuditEvent = AppealAuditEvent;

export class AppealAuditLog {
  private events: AppealAuditEvent[] = [];

  constructor(private readonly appealId: string) {}

  log(
    type: AppealAuditEventType,
    detail: string,
    metadata?: Record<string, unknown>,
    userId?: string,
  ): AppealAuditEvent {
    const event: AppealAuditEvent = {
      id: crypto.randomUUID(),
      appealId: this.appealId,
      type,
      timestamp: new Date().toISOString(),
      detail,
      ...(metadata ? { metadata } : {}),
      ...(userId ? { userId } : {}),
    };
    this.events.push(event);
    return event;
  }

  getAll(): AppealAuditEvent[] {
    return [...this.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getByType(type: AppealAuditEventType): AppealAuditEvent[] {
    return this.getAll().filter((event) => event.type === type);
  }

  getChronological(): AppealAuditEvent[] {
    return [...this.events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  count(): number {
    return this.events.length;
  }

  hasEvent(type: AppealAuditEventType): boolean {
    return this.events.some((event) => event.type === type);
  }

  getSummary(): Array<{ type: AppealAuditEventType; label: string; count: number }> {
    const counts = new Map<AppealAuditEventType, number>();
    for (const event of this.events) {
      counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      label: APPEAL_AUDIT_EVENT_LABELS[type],
      count,
    }));
  }

  clear(): void {
    this.events = [];
  }
}

export { AppealAuditLog as AuditLog };

export function createAppealAuditLog(appealId: string): AppealAuditLog {
  return new AppealAuditLog(appealId);
}

export const createAuditLog = createAppealAuditLog;
