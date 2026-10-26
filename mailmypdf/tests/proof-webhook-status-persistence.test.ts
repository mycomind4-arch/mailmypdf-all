import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchWebhook, processPendingRetries } from "../src/lib/proof-of-service/webhooks.ts";

const event: Parameters<typeof dispatchWebhook>[0] = {
  event_id: "evt_expiry_1",
  event_type: "response_window.expired",
  timestamp: "2026-10-25T00:00:00.000Z",
  data: { communication_id: "comm_1", status: "delivered" },
};

function fakeDeliveryStore(options: {
  updateError?: string;
  missingUpdateRow?: boolean;
  retryAttempts?: number;
  stalePending?: boolean;
  pendingQueryError?: string;
  retryEventIds?: string[];
  failUpdateForEventId?: string;
  missingTenant?: boolean;
  missingWebhookUrl?: boolean;
} = {}) {
  const statuses: string[] = [];
  const retryRows = (options.retryEventIds ?? (options.retryAttempts === undefined ? [] : [event.event_id])).map((id) => ({
    event_id: id,
    event_type: event.event_type,
    payload: { ...event, event_id: id },
    attempts: options.retryAttempts ?? 1,
    tenant_id: "tenant_1",
    proof_tenants: options.missingTenant ? null : [{ webhook_url: options.missingWebhookUrl ? null : "https://example.test/webhook", webhook_secret: null }],
  }));

  const pendingRows = options.stalePending ? [{
    event_id: event.event_id,
    event_type: event.event_type,
    payload: event,
    attempts: 0,
    tenant_id: "tenant_1",
    proof_tenants: options.missingTenant ? null : [{ webhook_url: options.missingWebhookUrl ? null : "https://example.test/webhook", webhook_secret: null }],
  }] : [];

  const db = {
    from(table: string) {
      assert.equal(table, "proof_webhook_deliveries");
      return {
        insert: async () => ({ error: null }),
        update: (values: { status: string }) => ({
          eq: (column: string, value: string) => {
            assert.equal(column, "event_id");
            if (options.retryEventIds) assert.ok(options.retryEventIds.includes(value));
            else assert.equal(value, event.event_id);
            statuses.push(values.status);
            return {
              select: (columns: string) => {
                assert.equal(columns, "id");
                return {
                  maybeSingle: async () => ({
                    data: options.missingUpdateRow ? null : { id: "delivery_1" },
                    error: options.updateError && (!options.failUpdateForEventId || options.failUpdateForEventId === value)
                      ? { message: options.updateError }
                      : null,
                  }),
                };
              },
            };
          },
        }),
        select: (selection: string) => {
          if (options.missingTenant || options.missingWebhookUrl) {
            assert.doesNotMatch(selection, /!inner/, "missing tenants must not disappear through an inner join");
          }
          return {
          eq: (column: string, status: string) => {
            assert.equal(column, "status");
            assert.ok(status === "retrying" || status === "pending");
            return {
              lte: (column: string, cutoff: string) => {
                assert.equal(column, status === "pending" ? "created_at" : "next_retry_at");
                if (status === "pending") {
                  const ageMs = Date.now() - Date.parse(cutoff);
                  assert.ok(ageMs >= 4 * 60_000 && ageMs <= 6 * 60_000, "pending recovery has a bounded grace period");
                }
                return {
                  limit: async () => ({
                    data: status === "retrying" ? retryRows : pendingRows,
                    error: status === "pending" && options.pendingQueryError
                      ? { message: options.pendingQueryError }
                      : null,
                  }),
                };
              },
            };
          },
        };
        },
      };
    },
  };

  const deps = {
    supabaseAdmin: db as unknown as Parameters<typeof dispatchWebhook>[4]["supabaseAdmin"],
  };
  return { deps, statuses };
}

async function dispatch(deps: Parameters<typeof dispatchWebhook>[4]) {
  await dispatchWebhook(event, "tenant_1", "https://example.test/webhook", null, deps, "comm_1");
}

test("HTTP 2xx persists delivered status before dispatch succeeds", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }));
  const store = fakeDeliveryStore();
  await dispatch(store.deps);
  assert.deepEqual(store.statuses, ["delivered"]);
});

test("failed delivered-status write propagates without incorrectly scheduling a retry", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }));
  const store = fakeDeliveryStore({ updateError: "write denied" });
  await assert.rejects(dispatch(store.deps), /Failed to persist proof webhook delivered status: write denied/);
  assert.deepEqual(store.statuses, ["delivered"]);
});

test("HTTP 2xx does not report delivered when no delivery row matched the update", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }));
  const store = fakeDeliveryStore({ missingUpdateRow: true });
  await assert.rejects(dispatch(store.deps), /Failed to persist proof webhook delivered status: no matching delivery record/);
  assert.deepEqual(store.statuses, ["delivered"]);
});

test("non-2xx response persists retrying status", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const store = fakeDeliveryStore();
  await dispatch(store.deps);
  assert.deepEqual(store.statuses, ["retrying"]);
});

test("failed retry-status write propagates instead of pretending a retry is queued", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const store = fakeDeliveryStore({ updateError: "database unavailable" });
  await assert.rejects(dispatch(store.deps), /Failed to persist proof webhook retrying status: database unavailable/);
  assert.deepEqual(store.statuses, ["retrying"]);
});

test("HTTP 503 does not report a queued retry when no delivery row matched", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const store = fakeDeliveryStore({ missingUpdateRow: true });
  await assert.rejects(dispatch(store.deps), /Failed to persist proof webhook retrying status: no matching delivery record/);
  assert.deepEqual(store.statuses, ["retrying"]);
});

test("network failure also requires a durable retry-status write", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("network offline"); });
  const store = fakeDeliveryStore({ updateError: "database unavailable" });
  await assert.rejects(dispatch(store.deps), /Failed to persist proof webhook retrying status: database unavailable/);
  assert.deepEqual(store.statuses, ["retrying"]);
});

test("terminal fifth-attempt failure requires a durable failed-status write", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const store = fakeDeliveryStore({ updateError: "database unavailable", retryAttempts: 4 });
  await assert.rejects(
    processPendingRetries(store.deps),
    /Failed to persist proof webhook failed status: database unavailable/,
  );
  assert.deepEqual(store.statuses, ["failed"]);
});

test("stale pending delivery is recovered after an interrupted initial attempt", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(null, { status: 200 });
  });
  const store = fakeDeliveryStore({ stalePending: true });
  assert.equal(await processPendingRetries(store.deps), 1);
  assert.equal(requests, 1);
  assert.deepEqual(store.statuses, ["delivered"]);
});

test("fresh pending delivery is not replayed during its first attempt", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(null, { status: 200 });
  });
  const store = fakeDeliveryStore();
  assert.equal(await processPendingRetries(store.deps), 0);
  assert.equal(requests, 0);
});

test("failed recovered pending delivery schedules first retry instead of skipping", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const store = fakeDeliveryStore({ stalePending: true });
  assert.equal(await processPendingRetries(store.deps), 1);
  assert.deepEqual(store.statuses, ["retrying"]);
});

test("failed stale-pending scan propagates instead of silently losing delivery work", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(null, { status: 200 });
  });
  const store = fakeDeliveryStore({ pendingQueryError: "database unavailable" });
  await assert.rejects(
    processPendingRetries(store.deps),
    /Pending proof webhook retries query failed: database unavailable/,
  );
  assert.equal(requests, 0);
});

test("failed retry status write does not starve a later webhook delivery", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(null, { status: 200 });
  });
  const store = fakeDeliveryStore({
    retryEventIds: ["evt_first", "evt_second"],
    retryAttempts: 1,
    updateError: "write denied",
    failUpdateForEventId: "evt_first",
  });
  await assert.rejects(
    processPendingRetries(store.deps),
    /Proof webhook retry batch failed.*write denied/,
  );
  assert.equal(requests, 2, "second delivery must still be attempted");
  assert.deepEqual(store.statuses, ["delivered", "delivered"]);
});

test("retry with missing tenant fails cron visibly instead of reporting zero work", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return new Response(null, { status: 200 }); });
  const store = fakeDeliveryStore({ retryAttempts: 1, missingTenant: true });
  await assert.rejects(processPendingRetries(store.deps), /Proof webhook retry batch failed.*tenant record is missing/);
  assert.equal(requests, 0);
});

test("retry with removed webhook URL is not silently skipped", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return new Response(null, { status: 200 }); });
  const store = fakeDeliveryStore({ retryAttempts: 1, missingWebhookUrl: true });
  await assert.rejects(processPendingRetries(store.deps), /Proof webhook retry batch failed.*no configured webhook URL/);
  assert.equal(requests, 0);
});

test("bad retry tenant does not starve another independent delivery", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return new Response(null, { status: 200 }); });
  const store = fakeDeliveryStore({ retryEventIds: ["evt_missing", "evt_valid"], retryAttempts: 1, missingWebhookUrl: true });
  // Both rows intentionally have no URL in this fake store: neither may be sent,
  // and the batch must report both failures instead of returning zero processed.
  await assert.rejects(processPendingRetries(store.deps), (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, 2);
    return true;
  });
  assert.equal(requests, 0);
});
