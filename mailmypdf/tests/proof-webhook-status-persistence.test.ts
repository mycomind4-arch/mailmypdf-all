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
} = {}) {
  const statuses: string[] = [];
  const pending = options.retryAttempts === undefined ? [] : [{
    event_id: event.event_id,
    event_type: event.event_type,
    payload: event,
    attempts: options.retryAttempts,
    tenant_id: "tenant_1",
    proof_tenants: [{ webhook_url: "https://example.test/webhook", webhook_secret: null }],
  }];

  const db = {
    from(table: string) {
      assert.equal(table, "proof_webhook_deliveries");
      return {
        insert: async () => ({ error: null }),
        update: (values: { status: string }) => ({
          eq: (column: string, value: string) => {
            assert.equal(column, "event_id");
            assert.equal(value, event.event_id);
            statuses.push(values.status);
            return {
              select: (columns: string) => {
                assert.equal(columns, "id");
                return {
                  maybeSingle: async () => ({
                    data: options.missingUpdateRow ? null : { id: "delivery_1" },
                    error: options.updateError ? { message: options.updateError } : null,
                  }),
                };
              },
            };
          },
        }),
        select: () => ({
          eq: () => ({
            lte: () => ({
              limit: async () => ({ data: pending, error: null }),
            }),
          }),
        }),
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
