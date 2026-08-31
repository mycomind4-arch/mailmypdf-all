import { describe, expect, it, vi } from "vitest";
import { createTriggerSchedule } from "./trigger";

describe("Trigger schedule adapter", () => {
  const input = {
    task: "send-mail",
    payload: { mailJobId: "job-1" },
    cron: "0 9 * * *",
    timezone: "America/Los_Angeles",
    externalId: "schedule-1",
  };

  it("requires a durable schedule id in a successful response", async () => {
    process.env.TRIGGER_SECRET_KEY = "secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await expect(createTriggerSchedule(input)).rejects.toThrow("missing a durable schedule id");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("returns the durable schedule id from a valid response", async () => {
    process.env.TRIGGER_SECRET_KEY = "secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "schedule-123" }), { status: 200 }),
    );

    await expect(createTriggerSchedule(input)).resolves.toEqual({ id: "schedule-123" });
    fetchSpy.mockRestore();
  });
});
