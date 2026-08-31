export type ExecutionStatus = "pending" | "running" | "succeeded" | "failed";

export type ExecutionRecord = {
  id: string;
  scheduleId: string;
  mailJobId: string;
  idempotencyKey: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
};

export interface ExecutionStore {
  acquire(scheduleId: string, idempotencyKey: string): Promise<ExecutionRecord | null>;
  start(id: string): Promise<ExecutionRecord>;
  succeed(id: string, result: Record<string, unknown>): Promise<ExecutionRecord>;
  fail(id: string, error: string): Promise<ExecutionRecord>;
}

export class InMemoryExecutionStore implements ExecutionStore {
  private records = new Map<string, ExecutionRecord>();
  private keys = new Map<string, string>();

  async acquire(scheduleId: string, idempotencyKey: string) {
    const existingId = this.keys.get(idempotencyKey);
    if (existingId) return this.records.get(existingId) ?? null;
    const record: ExecutionRecord = { id: crypto.randomUUID(), scheduleId, mailJobId: scheduleId, idempotencyKey, status: "pending" };
    this.records.set(record.id, record);
    this.keys.set(idempotencyKey, record.id);
    return record;
  }

  private update(id: string, patch: Partial<ExecutionRecord>) {
    const current = this.records.get(id);
    if (!current) throw new Error(`Execution ${id} not found`);
    const updated = { ...current, ...patch };
    this.records.set(id, updated);
    return updated;
  }

  async start(id: string) { return this.update(id, { status: "running", startedAt: new Date().toISOString() }); }
  async succeed(id: string, result: Record<string, unknown>) { return this.update(id, { status: "succeeded", result, completedAt: new Date().toISOString() }); }
  async fail(id: string, error: string) { return this.update(id, { status: "failed", error, completedAt: new Date().toISOString() }); }
}
