import type { AuditEvent, AuditEventType, CreateAuditEventInput } from "./event";
import { createAuditEvent } from "./event";

export interface AuditRepository {
  append(input: CreateAuditEventInput): Promise<AuditEvent>;
  listMatter(ownerId: string, matterId: string): Promise<AuditEvent[]>;
  listByType(ownerId: string, matterId: string, type: AuditEventType): Promise<AuditEvent[]>;
  hasEvent(ownerId: string, matterId: string, type: AuditEventType): Promise<boolean>;
}

/**
 * Test/dev implementation only. Production callers should use a durable adapter.
 * The API is intentionally append-only; no update/delete methods are exposed.
 */
export class MemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];

  async append(input: CreateAuditEventInput): Promise<AuditEvent> {
    const event = createAuditEvent(input);
    if (this.events.some((candidate) => candidate.id === event.id)) {
      throw new Error(`Audit event id already exists: ${event.id}`);
    }
    this.events.push(event);
    return event;
  }

  async listMatter(ownerId: string, matterId: string): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.ownerId === ownerId && event.matterId === matterId)
      .slice()
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async listByType(ownerId: string, matterId: string, type: AuditEventType): Promise<AuditEvent[]> {
    return (await this.listMatter(ownerId, matterId)).filter((event) => event.type === type);
  }

  async hasEvent(ownerId: string, matterId: string, type: AuditEventType): Promise<boolean> {
    return (await this.listByType(ownerId, matterId, type)).length > 0;
  }
}
