import { test } from "node:test";
import assert from "node:assert/strict";
import { completeExpiryNotification } from "../src/lib/proof-of-service/expiry-notification.ts";

test("successful expiry dispatch is followed by marking the communication notified", async () => {
  const calls: string[] = [];
  await completeExpiryNotification({
    dispatch: async () => { calls.push("dispatch"); },
    markNotified: async () => { calls.push("mark"); return { error: null }; },
  });
  assert.deepEqual(calls, ["dispatch", "mark"]);
});

test("failed dispatch does not mark an expiry as notified", async () => {
  let marked = false;
  await assert.rejects(
    completeExpiryNotification({
      dispatch: async () => { throw new Error("delivery record insert failed"); },
      markNotified: async () => { marked = true; return { error: null }; },
    }),
    /delivery record insert failed/,
  );
  assert.equal(marked, false);
});

test("failed metadata update surfaces an error to the processor", async () => {
  await assert.rejects(
    completeExpiryNotification({
      dispatch: async () => {},
      markNotified: async () => ({ error: { message: "database unavailable" } }),
    }),
    /Failed to mark proof response window notification: database unavailable/,
  );
});

test("no webhook still requires a successful notification-state update", async () => {
  let marked = false;
  await completeExpiryNotification({
    markNotified: async () => { marked = true; return { error: null }; },
  });
  assert.equal(marked, true);
});

test("missing database update result fails closed", async () => {
  await assert.rejects(
    completeExpiryNotification({
      markNotified: async () => null as never,
    }),
    /no update result/,
  );
});
