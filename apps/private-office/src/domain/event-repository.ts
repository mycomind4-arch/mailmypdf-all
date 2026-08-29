/**
 * Immutable audit event repository for Private Office.
 *
 * Events are the authoritative record of what happened in a matter.
 * They are insert-only — no update or delete. The server enforces
 * immutability via RLS (no update/delete policies) and the event_type
 * CHECK constraint prevents fabrication of unknown event types.
 */

export const EVENT_TYPES = [
  "matter_created",
  "intake_updated",
  "document_added",
  "evidence_added",
  "evidence_verified",
  "evidence_rejected",
  "analysis_generated",
  "draft_generated",
  "draft_revised",
  "draft_reviewed",
  "approval_granted",
  "approval_invalidated",
  "fulfillment_requested",
  "fulfillment_rejected",
  "fulfillment_submitted",
  "delivery_recorded",
  "proof_recorded",
  "escalation_triggered",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface MatterEvent {
  id: string;
  matterId: string;
  ownerId: string;
  eventType: EventType;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEventInput {
  matterId: string;
  ownerId: string;
  eventType: EventType;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MatterEventRepository {
  record(input: CreateEventInput): Promise<MatterEvent>;
  list(ownerId: string, matterId: string): Promise<MatterEvent[]>;
}

export class EventValidationError extends Error {
  constructor() {
    super("Event validation failed: unknown event type or missing required fields");
    this.name = "EventValidationError";
  }
}

export function validateEventType(type: string): asserts type is EventType {
  if (!EVENT_TYPES.includes(type as EventType))
    throw new EventValidationError();
}
