import { test } from "node:test";
import assert from "node:assert/strict";
import { requireWebhookRetryRows, processWebhookRetryBatch, requireWebhookRetryTarget } from "../src/lib/proof-of-service/webhook-retry-query.ts";

test("successful empty webhook retry scan returns no work", () => {
  assert.deepEqual(requireWebhookRetryRows({ data: [], error: null }), []);
});

test("successful webhook retry scan preserves retry rows", () => {
  const rows = [{ event_id: "evt_retry_1" }];
  assert.strictEqual(requireWebhookRetryRows({ data: rows, error: null }), rows);
});

test("webhook retry query failure cannot be reported as zero processed", () => {
  assert.throws(
    () => requireWebhookRetryRows({ data: null, error: { message: "database unavailable" } }),
    /Pending proof webhook retries query failed: database unavailable/,
  );
});

test("webhook retry scan rejects missing data without an explicit error", () => {
  assert.throws(
    () => requireWebhookRetryRows({ data: null, error: null }),
    /returned no rows array/,
  );
});

test("webhook retry scan prioritizes an error even when data is present", () => {
  assert.throws(
    () => requireWebhookRetryRows({ data: [{ event_id: "stale" }], error: { message: "stale read" } }),
    /Pending proof webhook retries query failed: stale read/,
  );
});

test("failed webhook retry does not prevent later independent deliveries", async () => {
  const visited: string[] = [];
  await assert.rejects(
    processWebhookRetryBatch(["bad", "good"], async (id) => {
      visited.push(id);
      if (id === "bad") throw new Error("write denied");
      return true;
    }),
    /Proof webhook retry batch failed for 1 delivery\(s\) after 1 processed: write denied/,
  );
  assert.deepEqual(visited, ["bad", "good"]);
});

test("webhook retry batch counts completed deliveries but not skipped rows", async () => {
  assert.equal(
    await processWebhookRetryBatch(["skip", "send"], async (id) => id === "send"),
    1,
  );
});

test("webhook retry batch preserves non-Error failures without dropping later work", async () => {
  const visited: number[] = [];
  await assert.rejects(
    processWebhookRetryBatch([1, 2, 3], async (id) => {
      visited.push(id);
      if (id === 1) throw "database unavailable";
      if (id === 2) throw new Error("status write failed");
      return true;
    }),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.errors.length, 2);
      assert.match(error.message, /database unavailable/);
      assert.match(error.message, /status write failed/);
      assert.match(error.message, /after 1 processed/);
      return true;
    },
  );
  assert.deepEqual(visited, [1, 2, 3]);
});

test("missing tenant for queued webhook delivery fails closed", () => {
  assert.throws(() => requireWebhookRetryTarget(null), /tenant record is missing/);
});

test("disabled or empty tenant webhook destination fails closed", () => {
  assert.throws(() => requireWebhookRetryTarget({ webhook_url: null }), /no configured webhook URL/);
  assert.throws(() => requireWebhookRetryTarget({ webhook_url: "   " }), /no configured webhook URL/);
});

test("valid retry tenant preserves URL and signing secret", () => {
  assert.deepEqual(
    requireWebhookRetryTarget({ webhook_url: "https://example.test/hook", webhook_secret: "secret" }),
    { webhookUrl: "https://example.test/hook", webhookSecret: "secret" },
  );
});

test("invalid retry signing secret fails instead of sending unsigned", () => {
  assert.throws(
    () => requireWebhookRetryTarget({ webhook_url: "https://example.test/hook", webhook_secret: 42 }),
    /invalid webhook secret/,
  );
});
