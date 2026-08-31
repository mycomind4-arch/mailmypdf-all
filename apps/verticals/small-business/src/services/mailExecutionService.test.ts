import { describe, expect, it } from "vitest";
import { executeScheduledMail } from "./mailExecutionService";
import { InMemoryExecutionStore } from "./executionStore";
import { InMemoryEventLog } from "./eventLog";
import type { ScheduledMail } from "./scheduleEngine";

const schedule: ScheduledMail = {
  mailJobId: "job-1",
  businessId: "business-1",
  recipientId: "recipient-1",
  documentId: "document-1",
  mailClass: "certified",
  timezone: "America/Los_Angeles",
  rule: { type: "once", runAt: "2026-08-21T10:00:00.000Z" },
  requiresApproval: true,
};

describe("executeScheduledMail", () => {
  it("records provider acceptance separately when tracking/proof are not complete", async () => {
    const executions = new InMemoryExecutionStore();
    const events = new InMemoryEventLog();
    const mail = {
      executeMailJob: async () => ({ mailJobId: "job-1", status: "submitted" }),
    };

    const result = await executeScheduledMail({
      schedule,
      occurrence: new Date("2026-08-21T10:00:00.000Z"),
      approvalStatus: "approved",
      executions,
      mail,
      events,
    });

    expect(result.status).toBe("executed");
    expect(events.events.map((event) => event.type)).toEqual([
      "mailing.executing",
      "mailing.accepted",
      "mailing.proof_pending",
    ]);
    expect(events.events.some((event) => event.type === "mailing.sent")).toBe(false);
  });

  it("records mailing.sent only when tracking and proof are present", async () => {
    const executions = new InMemoryExecutionStore();
    const events = new InMemoryEventLog();
    const mail = {
      executeMailJob: async () => ({
        mailJobId: "job-1",
        status: "submitted",
        trackingNumber: "9400",
        proofId: "proof-1",
      }),
    };

    await executeScheduledMail({
      schedule,
      occurrence: new Date("2026-08-21T10:00:00.000Z"),
      approvalStatus: "approved",
      executions,
      mail,
      events,
    });

    expect(events.events.map((event) => event.type)).toEqual([
      "mailing.executing",
      "mailing.accepted",
      "mailing.sent",
    ]);
  });

  it("does not execute approval-required mail without approval", async () => {
    const executions = new InMemoryExecutionStore();
    const events = new InMemoryEventLog();
    let called = false;
    const mail = {
      executeMailJob: async () => {
        called = true;
        return { mailJobId: "job-1", status: "submitted" };
      },
    };

    const result = await executeScheduledMail({
      schedule,
      occurrence: new Date("2026-08-21T10:00:00.000Z"),
      approvalStatus: "pending",
      executions,
      mail,
      events,
    });

    expect(result.status).toBe("skipped");
    expect(called).toBe(false);
    expect(events.events).toEqual([]);
  });
});
