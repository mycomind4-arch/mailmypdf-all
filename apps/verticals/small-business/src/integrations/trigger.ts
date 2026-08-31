import { z } from "zod";

export interface TriggerScheduleRequest {
  task: string;
  payload: Record<string, unknown>;
  cron: string;
  timezone: string;
  externalId: string;
}

const triggerScheduleResponseSchema = z.object({
  id: z.string().min(1),
});

/** Server-side adapter. Keep Trigger.dev behind this boundary. */
export async function createTriggerSchedule(input: TriggerScheduleRequest) {
  const baseUrl = process.env.TRIGGER_API_URL ?? "https://api.trigger.dev";
  const token = process.env.TRIGGER_SECRET_KEY;
  if (!token) throw new Error("TRIGGER_SECRET_KEY is not configured");
  if (!input.task.trim()) throw new Error("Trigger.dev task is required");
  if (!input.cron.trim()) throw new Error("Trigger.dev cron expression is required");
  if (!input.timezone.trim()) throw new Error("Trigger.dev timezone is required");
  if (!input.externalId.trim()) throw new Error("Trigger.dev externalId is required");

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/schedules`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      task: input.task,
      cron: input.cron,
      timezone: input.timezone,
      externalId: input.externalId,
      payload: input.payload,
    }),
  });

  if (!response.ok) throw new Error(`Trigger.dev schedule creation failed: ${response.status}`);

  const body: unknown = await response.json();
  const parsed = triggerScheduleResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Trigger.dev schedule response is missing a durable schedule id");
  }

  return parsed.data;
}
