export type ScheduleRecord = {
  id: string;
  businessId: string;
  mailJobId: string;
  timezone: string;
  rule: unknown;
  requiresApproval: boolean;
  status: "active" | "paused" | "cancelled";
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface ScheduleStore {
  create(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">): Promise<ScheduleRecord>;
  get(id: string): Promise<ScheduleRecord | null>;
  updateNextRun(id: string, nextRunAt: string | null): Promise<ScheduleRecord>;
  setStatus(id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord>;
}

/** In-memory adapter used for local development/tests. Production adapters should implement this interface with Postgres/Supabase. */
export class InMemoryScheduleStore implements ScheduleStore {
  private records = new Map<string, ScheduleRecord>();

  async create(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">): Promise<ScheduleRecord> {
    const now = new Date().toISOString();
    const record = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this.records.set(record.id, record);
    return record;
  }

  async get(id: string) { return this.records.get(id) ?? null; }

  async updateNextRun(id: string, nextRunAt: string | null) {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Schedule ${id} not found`);
    const updated = { ...existing, nextRunAt, updatedAt: new Date().toISOString() };
    this.records.set(id, updated);
    return updated;
  }

  async setStatus(id: string, status: ScheduleRecord["status"]) {
    const existing = this.records.get(id);
    if (!existing) throw new Error(`Schedule ${id} not found`);
    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    this.records.set(id, updated);
    return updated;
  }
}
