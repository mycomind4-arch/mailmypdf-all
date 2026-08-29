import { z } from "zod";
import type { MailClass } from "../domain/mail";

export const scheduleRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("once"), runAt: z.string().datetime() }),
  z.object({ type: z.literal("daily"), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) }),
  z.object({ type: z.literal("weekly"), days: z.array(z.number().int().min(0).max(6)).min(1), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) }),
  z.object({ type: z.literal("monthly"), day: z.number().int().min(1).max(31), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) }),
]);

const timezoneSchema = z.string().min(1).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}, "timezone must be a valid IANA time zone");

export const scheduledMailSchema = z.object({
  mailJobId: z.string().min(1),
  businessId: z.string().min(1),
  recipientId: z.string().min(1),
  documentId: z.string().min(1),
  mailClass: z.enum(["standard", "certified", "registered"] satisfies MailClass[]),
  timezone: timezoneSchema,
  rule: scheduleRuleSchema,
  requiresApproval: z.boolean().default(false),
});

export type ScheduledMail = z.infer<typeof scheduledMailSchema>;

/**
 * Calculates the next occurrence without silently executing a mailing.
 * Production execution is delegated to Trigger.dev; this function is the
 * deterministic domain boundary used by the API and UI.
 */
export function nextOccurrence(schedule: ScheduledMail, from = new Date()): Date | null {
  const rule = schedule.rule;
  if (rule.type === "once") {
    const date = new Date(rule.runAt);
    return date > from ? date : null;
  }

  const candidate = new Date(from);
  candidate.setSeconds(0, 0);

  if (rule.type === "daily") {
    candidate.setHours(rule.hour, rule.minute, 0, 0);
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (rule.type === "weekly") {
    for (let offset = 0; offset <= 7; offset++) {
      const date = new Date(candidate);
      date.setDate(candidate.getDate() + offset);
      if (rule.days.includes(date.getDay())) {
        date.setHours(rule.hour, rule.minute, 0, 0);
        if (date > from) return date;
      }
    }
    return null;
  }

  for (let offset = 0; offset <= 12; offset++) {
    const date = new Date(candidate.getFullYear(), candidate.getMonth() + offset, rule.day, rule.hour, rule.minute, 0, 0);
    if (date.getMonth() === candidate.getMonth() + offset && date > from) return date;
  }
  return null;
}

export function idempotencyKey(mailJobId: string, occurrence: Date): string {
  return `business:${mailJobId}:${occurrence.toISOString()}`;
}
