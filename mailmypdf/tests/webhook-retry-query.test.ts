import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireWebhookRetryRows, collectWebhookRetryRows, processWebhookRetryBatch, requireWebhookRetryTarget, assertIdempotentWebhookDelivery, WebhookRetryBatchError } from "../src/lib/proof-of-service/webhook-retry-query.ts";

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

test("independent scan errors are retained while valid rows are collected", async () => {
  const errors: Error[] = [];
  const failed = await collectWebhookRetryRows(Promise.resolve({
    data: null, error: { message: "scan offline" },
  }), errors);
  const good = await collectWebhookRetryRows(Promise.resolve({
    data: [{ event_id: "evt_healthy" }], error: null,
  }), errors);
  assert.deepEqual(failed, []);
  assert.deepEqual(good, [{ event_id: "evt_healthy" }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /scan offline/);
});

test("rejected scan promises are reported without preventing independent work", async () => {
  const errors: Error[] = [];
  const failed = await collectWebhookRetryRows(Promise.reject(new Error("connection dropped")), errors);
  assert.deepEqual(failed, []);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /connection dropped/);
});

test("retry batch includes scan errors and still counts completed deliveries", async () => {
  const visited: string[] = [];
  await assert.rejects(
    processWebhookRetryBatch(["healthy"], async (id) => {
      visited.push(id);
      return true;
    }, [new Error("stale pending scan failed")]),
    (error: unknown) => {
      assert.ok(error instanceof WebhookRetryBatchError);
      assert.equal(error.processed, 1);
      assert.equal(error.errors.length, 1);
      assert.match(error.message, /stale pending scan failed/);
      return true;
    },
  );
  assert.deepEqual(visited, ["healthy"]);
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


test("duplicate webhook is idempotent only for the same durable event", () => {
  const expected = { tenantId: "tenant_1", communicationId: "comm_1", eventType: "response_window.expired" };
  for (const status of ["pending", "retrying", "delivered"]) {
    assert.doesNotThrow(() => assertIdempotentWebhookDelivery({
      tenant_id: "tenant_1", communication_id: "comm_1",
      event_type: "response_window.expired", status,
    }, expected));
  }
});

test("duplicate event ID cannot suppress another tenant or communication", () => {
  const expected = { tenantId: "tenant_1", communicationId: "comm_1", eventType: "response_window.expired" };
  const original = { tenant_id: "tenant_1", communication_id: "comm_1", event_type: "response_window.expired", status: "delivered" };
  for (const change of [{ tenant_id: "tenant_2" }, { communication_id: "comm_2" }, { event_type: "communication.delivered" }]) {
    assert.throws(() => assertIdempotentWebhookDelivery({ ...original, ...change }, expected), /different delivery/);
  }
});

test("duplicate terminal failure must not masquerade as delivered or retrying", () => {
  assert.throws(() => assertIdempotentWebhookDelivery({
    tenant_id: "tenant_1", communication_id: "comm_1",
    event_type: "response_window.expired", status: "failed",
  }, { tenantId: "tenant_1", communicationId: "comm_1", eventType: "response_window.expired" }), /non-retriable status: failed/);
});

test("unique conflict without a matching event record fails closed", () => {
  assert.throws(() => assertIdempotentWebhookDelivery(null, {
    tenantId: "tenant_1", communicationId: "comm_1", eventType: "response_window.expired",
  }), /no matching delivery record/);
});


test("partially failed webhook retry batch exposes completed count for maintenance reporting", async () => {
  await assert.rejects(
    processWebhookRetryBatch(["failed", "completed", "skipped"], async (row) => {
      if (row === "failed") throw new Error("status write denied");
      return row === "completed";
    }),
    (error: unknown) => {
      assert.ok(error instanceof WebhookRetryBatchError);
      assert.ok(error instanceof AggregateError);
      assert.equal(error.processed, 1);
      assert.equal(error.errors.length, 1);
      assert.match(error.message, /after 1 processed/);
      return true;
    },
  );
});

test("webhook retry batch with only failures reports zero completed deliveries", async () => {
  await assert.rejects(
    processWebhookRetryBatch(["failed"], async () => { throw new Error("tenant missing"); }),
    (error: unknown) => {
      assert.ok(error instanceof WebhookRetryBatchError);
      assert.equal(error.processed, 0);
      return true;
    },
  );
});

test("proof processor preserves partial retry progress while reporting HTTP failure", () => {
  const route = readFileSync(new URL("../src/routes/api/internal/proof-processor.ts", import.meta.url), "utf8");
  assert.match(route, /if \(e instanceof WebhookRetryBatchError\)\s*\{\s*results\.webhook_retries = e\.processed;/);
  assert.match(route, /const ok = results\.errors\.length === 0;/);
  assert.match(route, /status: ok \? 200 : 500/);
});
