import { test } from "node:test";
import assert from "node:assert/strict";
import { completeExpiryNotification, requireExpiryTenant } from "../src/lib/proof-of-service/expiry-notification.ts";

test("successful expiry dispatch is followed by marking the communication notified", async () => {
  const calls: string[] = [];
  await completeExpiryNotification({
    dispatch: async () => { calls.push("dispatch"); },
    markNotified: async () => { calls.push("mark"); return { data: { id: "comm_1" }, error: null }; },
  });
  assert.deepEqual(calls, ["dispatch", "mark"]);
});

test("failed dispatch does not mark an expiry as notified", async () => {
  let marked = false;
  await assert.rejects(
    completeExpiryNotification({
      dispatch: async () => { throw new Error("delivery record insert failed"); },
      markNotified: async () => { marked = true; return { data: { id: "comm_1" }, error: null }; },
    }),
    /delivery record insert failed/,
  );
  assert.equal(marked, false);
});

test("failed metadata update surfaces an error to the processor", async () => {
  await assert.rejects(
    completeExpiryNotification({
      dispatch: async () => {},
      markNotified: async () => ({ data: null, error: { message: "database unavailable" } }),
    }),
    /Failed to mark proof response window notification: database unavailable/,
  );
});

test("no webhook still requires a successful notification-state update", async () => {
  let marked = false;
  await completeExpiryNotification({
    markNotified: async () => { marked = true; return { data: { id: "comm_1" }, error: null }; },
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

test("zero matching communication rows cannot be reported as notified", async () => {
  await assert.rejects(
    completeExpiryNotification({
      dispatch: async () => {},
      markNotified: async () => ({ data: null, error: null }),
    }),
    /Failed to mark proof response window notification: no matching communication row/,
  );
});

test("an update response without a communication ID cannot be treated as success", async () => {
  await assert.rejects(
    completeExpiryNotification({
      markNotified: async () => ({ data: { id: "" }, error: null }),
    }),
    /no matching communication row/,
  );
});


test("missing proof tenant cannot be treated as a tenant without a webhook", () => {
  assert.throws(
    () => requireExpiryTenant({ data: null, error: null }),
    /Proof tenant lookup returned no matching tenant/,
  );
});

test("proof tenant database lookup errors fail closed", () => {
  assert.throws(
    () => requireExpiryTenant({ data: null, error: { message: "database unavailable" } }),
    /Proof tenant lookup failed: database unavailable/,
  );
});

test("valid proof tenant with no webhook remains a supported configuration", () => {
  const tenant = { webhook_url: null, webhook_secret: null };
  assert.strictEqual(requireExpiryTenant({ data: tenant, error: null }), tenant);
});

test("proof tenant query error takes precedence over stale returned data", () => {
  assert.throws(
    () => requireExpiryTenant({ data: { webhook_url: null }, error: { message: "stale read" } }),
    /Proof tenant lookup failed: stale read/,
  );
});
