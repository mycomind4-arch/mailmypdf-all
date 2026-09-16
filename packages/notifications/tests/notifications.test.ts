import assert from "node:assert/strict";
import test from "node:test";
import { createDeadlineReminders, sendNotificationOnce } from "../src/index.js";

test("notification delivery retries then stores one successful receipt", async () => {
  let calls = 0;
  let receipt: any = null;

  const store = {
    async load() { return receipt; },
    async claim() { return true; },
    async markSent(key: string, update: any) {
      receipt = { idempotencyKey: key, status: "sent", ...update };
    },
    async markFailed() { throw new Error("should not fail"); },
  };

  const result = await sendNotificationOnce({
    message: {
      idempotencyKey: "mail:m1",
      kind: "mailed",
      channel: "email",
      recipient: "a@example.com",
      subject: "Mailed",
      text: "Sent",
    },
    provider: {
      name: "fake",
      async send() {
        calls += 1;
        if (calls === 1) throw new Error("temporary");
        return { messageId: "msg-1" };
      },
    },
    store,
    policy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
    sleep: async () => {},
    now: () => "2026-09-16T00:00:00.000Z",
  });

  assert.equal(result.receipt.status, "sent");
  assert.equal(calls, 2);

  const replay = await sendNotificationOnce({
    message: {
      idempotencyKey: "mail:m1",
      kind: "mailed",
      channel: "email",
      recipient: "a@example.com",
      subject: "Mailed",
      text: "Sent",
    },
    provider: { name: "fake", async send() { calls += 1; return {}; } },
    store,
  });

  assert.equal(replay.replayed, true);
  assert.equal(calls, 2);
});

test("deadline reminders are deterministic and omit past reminders", () => {
  const reminders = createDeadlineReminders({
    matterId: "m1",
    workflowId: "cp2000",
    deadlineAt: "2026-10-01T00:00:00Z",
    offsetsDays: [30, 14, 7, 1, 0],
    now: "2026-09-16T00:00:00Z",
  });

  assert.deepEqual(reminders.map((r) => r.offsetDays), [14, 7, 1, 0]);
  assert.equal(new Set(reminders.map((r) => r.id)).size, 4);
});
