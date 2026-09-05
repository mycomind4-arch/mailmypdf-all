import type { ScheduleStore, ScheduleRecord } from "./scheduleStore";

export type PostgresLikeClient = {
  from(table: string): {
    insert(values: Record<string, unknown>): {
      select(): {
        single(): Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
      };
    };
    select(columns?: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        select(): {
          single(): Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    };
  };
};

function mapRow(row: Record<string, unknown>): ScheduleRecord {
  return {
    id: String(row.id), businessId: String(row.business_id), mailJobId: String(row.mail_job_id),
    timezone: String(row.timezone), rule: row.rule, requiresApproval: Boolean(row.requires_approval),
    status: row.status as ScheduleRecord["status"], nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export class PostgresScheduleStore implements ScheduleStore {
  constructor(private readonly db: PostgresLikeClient) {}

  async create(input: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt">) {
    const { data, error } = await this.db.from("schedules").insert({
      business_id: input.businessId, mail_job_id: input.mailJobId, timezone: input.timezone,
      rule: input.rule, requires_approval: input.requiresApproval, status: input.status, next_run_at: input.nextRunAt,
    }).select().single();
    if (error || !data) throw error ?? new Error("Failed to create schedule");
    return mapRow(data);
  }

  async get(id: string) {
    const { data, error } = await this.db.from("schedules").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  }

  async updateNextRun(id: string, nextRunAt: string | null) {
    const { data, error } = await this.db.from("schedules").update({ next_run_at: nextRunAt }).eq("id", id).select().single();
    if (error || !data) throw error ?? new Error("Schedule not found");
    return mapRow(data);
  }

  async setStatus(id: string, status: ScheduleRecord["status"]) {
    const { data, error } = await this.db.from("schedules").update({ status }).eq("id", id).select().single();
    if (error || !data) throw error ?? new Error("Schedule not found");
    return mapRow(data);
  }
}
