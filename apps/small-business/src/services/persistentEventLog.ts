import type { BusinessEvent, BusinessEventType, EventLog } from "./eventLog";

export type EventDbClient = {
  from(table: string): {
    insert(values: Record<string, unknown>): { select(): { single(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> } };
  };
};

export class PostgresEventLog implements EventLog {
  constructor(private readonly db: EventDbClient) {}

  async append(input: Omit<BusinessEvent, "id" | "occurredAt">): Promise<BusinessEvent> {
    const { data, error } = await this.db.from("business_events").insert({
      business_id: input.businessId, type: input.type as BusinessEventType, actor_id: input.actorId ?? null,
      entity_id: input.entityId, metadata: input.metadata ?? {},
    }).select().single();
    if (error || !data) throw error ?? new Error("Failed to append business event");
    return {
      id: String(data.id), businessId: String(data.business_id), type: data.type as BusinessEventType,
      actorId: data.actor_id ? String(data.actor_id) : undefined, entityId: String(data.entity_id),
      occurredAt: String(data.occurred_at), metadata: (data.metadata as Record<string, unknown>) ?? {},
    };
  }
}
