import { test } from "node:test";
import assert from "node:assert/strict";
import { requireWebhookRetryRows } from "../src/lib/proof-of-service/webhook-retry-query.ts";

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
