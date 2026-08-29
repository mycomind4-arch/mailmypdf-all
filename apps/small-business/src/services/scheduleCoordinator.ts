import { nextOccurrence, type ScheduledMail } from "./scheduleEngine";
import type { ScheduleStore } from "./scheduleStore";

export type TriggerScheduler = {
  schedule(input: { scheduleId: string; runAt: Date; timezone: string }): Promise<string>;
  cancel(triggerId: string): Promise<void>;
};

export async function createScheduleAndPlanNextRun(
  store: ScheduleStore,
  trigger: TriggerScheduler,
  schedule: ScheduledMail,
  record: Parameters<ScheduleStore["create"]>[0],
): Promise<{ scheduleId: string; triggerId: string | null; nextRunAt: string | null }> {
  const occurrence = nextOccurrence(schedule);
  const saved = await store.create({ ...record, nextRunAt: occurrence?.toISOString() ?? null });

  if (!occurrence) return { scheduleId: saved.id, triggerId: null, nextRunAt: null };

  const triggerId = await trigger.schedule({
    scheduleId: saved.id,
    runAt: occurrence,
    timezone: schedule.timezone,
  });

  return { scheduleId: saved.id, triggerId, nextRunAt: occurrence.toISOString() };
}

export async function pauseSchedule(store: ScheduleStore, trigger: TriggerScheduler, scheduleId: string, triggerId: string): Promise<void> {
  await trigger.cancel(triggerId);
  await store.setStatus(scheduleId, "paused");
}
