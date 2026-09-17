import type { PublicationManifest } from "./manifest.js";

export interface PublicationScheduleParts {
  date: string;
  hour: number;
  minute: number;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function publicationLocalParts(
  now: Date,
  timezone: string,
): PublicationScheduleParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdayMap: Record<string, PublicationScheduleParts["dayOfWeek"]> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = weekdayMap[value("weekday")];
  if (weekday === undefined) throw new Error("Unable to determine publication weekday");

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    dayOfWeek: weekday,
  };
}

/**
 * Returns the idempotency key for the current schedule window when due.
 * A non-null key means exactly one run may claim this window.
 */
export function publicationScheduleKey(
  schedule: PublicationManifest["schedule"],
  now: Date,
): string | null {
  if (schedule.frequency === "manual") return null;

  const local = publicationLocalParts(now, schedule.timezone);

  if (schedule.frequency === "hourly") {
    return `${local.date}T${String(local.hour).padStart(2, "0")}`;
  }

  const [targetHour, targetMinute] = (schedule.time ?? "00:00")
    .split(":")
    .map(Number);
  const localMinutes = local.hour * 60 + local.minute;
  const targetMinutes = (targetHour || 0) * 60 + (targetMinute || 0);

  if (schedule.frequency === "weekly" && local.dayOfWeek !== schedule.dayOfWeek) {
    return null;
  }
  if (localMinutes < targetMinutes) return null;

  return schedule.frequency === "weekly"
    ? `week:${local.date}`
    : local.date;
}
