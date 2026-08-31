export type BusinessEventType =
  | "schedule.created"
  | "schedule.paused"
  | "schedule.cancelled"
  | "mailing.approval_requested"
  | "mailing.approved"
  | "mailing.rejected"
  | "mailing.executing"
  | "mailing.accepted"
  | "mailing.proof_pending"
  | "mailing.sent"
  | "mailing.in_transit"
  | "mailing.delivered"
  | "mailing.returned"
  | "proof.generated";

export type BusinessEvent = {
  id: string;
  businessId: string;
  type: BusinessEventType;
  actorId?: string;
  entityId: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export interface EventLog {
  append(event: Omit<BusinessEvent, "id" | "occurredAt">): Promise<BusinessEvent>;
}

export class InMemoryEventLog implements EventLog {
  readonly events: BusinessEvent[] = [];

  async append(input: Omit<BusinessEvent, "id" | "occurredAt">): Promise<BusinessEvent> {
    const event = { ...input, id: crypto.randomUUID(), occurredAt: new Date().toISOString() };
    this.events.push(event);
    return event;
  }
}
