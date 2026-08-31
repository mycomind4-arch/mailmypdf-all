import type { Activity, ActivityType } from "../domain/crm";

export interface ActivityStore {
  append(input: Omit<Activity, "id" | "occurredAt"> & { occurredAt?: string }): Promise<Activity>;
  listForEntity(entityId: string): Promise<Activity[]>;
}

export class InMemoryActivityStore implements ActivityStore {
  private items: Activity[] = [];
  async append(input: Omit<Activity, "id" | "occurredAt"> & { occurredAt?: string }) {
    const item: Activity = { ...input, id: crypto.randomUUID(), occurredAt: input.occurredAt ?? new Date().toISOString() };
    this.items.push(item);
    return item;
  }
  async listForEntity(entityId: string) { return this.items.filter((item) => item.entityId === entityId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)); }
}

export function activityFromMailEvent(input: { businessId: string; mailJobId: string; type: Extract<ActivityType, "mailing" | "delivery" | "proof">; subject: string; metadata?: Record<string, unknown> }): Omit<Activity, "id" | "occurredAt"> {
  return { businessId: input.businessId, type: input.type, subject: input.subject, entityId: input.mailJobId, metadata: input.metadata };
}
