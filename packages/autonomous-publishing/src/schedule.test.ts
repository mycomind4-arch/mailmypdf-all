import assert from "node:assert/strict";
import test from "node:test";
import { publicationScheduleKey } from "./schedule.js";

test("daily schedule waits until local target time", () => {
  const schedule = { frequency: "daily", timezone: "America/Los_Angeles", time: "06:00" } as const;
  assert.equal(publicationScheduleKey(schedule, new Date("2026-09-16T12:59:00Z")), null);
  assert.equal(publicationScheduleKey(schedule, new Date("2026-09-16T13:00:00Z")), "2026-09-16");
});

test("weekly schedule runs only on configured local weekday", () => {
  const schedule = { frequency: "weekly", timezone: "America/Los_Angeles", time: "06:00", dayOfWeek: 3 } as const;
  assert.equal(publicationScheduleKey(schedule, new Date("2026-09-16T13:00:00Z")), "week:2026-09-16");
  assert.equal(publicationScheduleKey(schedule, new Date("2026-09-17T13:00:00Z")), null);
});

test("hourly schedule keys follow publication timezone", () => {
  const schedule = { frequency: "hourly", timezone: "America/Los_Angeles" } as const;
  assert.equal(publicationScheduleKey(schedule, new Date("2026-09-16T07:30:00Z")), "2026-09-16T00");
});
