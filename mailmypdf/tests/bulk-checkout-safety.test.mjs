import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("bulk checkout refuses client-priced, unbound multi-order payments", async () => {
  const src = await readFile(new URL("../src/lib/bulk-orders.functions.ts", import.meta.url), "utf8");
  const start = src.indexOf("export const createBulkCheckout");
  const end = src.indexOf("// ── Helpers", start);
  assert.ok(start >= 0 && end > start);
  const checkout = src.slice(start, end);
  assert.ok(checkout.includes("temporarily unavailable"));
  assert.ok(!checkout.includes("checkout.sessions.create"), "must not mint payable bulk Stripe sessions");
});

test("legacy bulk payment webhook never authorizes other order IDs or Lob", async () => {
  const src = await readFile(new URL("../src/routes/api/public/payments/webhook.ts", import.meta.url), "utf8");
  const start = src.indexOf("async function markOrderPaid");
  const end = src.indexOf('const orderId = getOrderId(session);', start);
  assert.ok(start >= 0 && end > start);
  const safety = src.slice(start, end);
  assert.ok(safety.includes('session.metadata?.isBulk === "true"'));
  assert.ok(safety.includes("manual reconciliation"));
  assert.ok(!safety.includes("metadata.orderIds.split"));
  assert.ok(!safety.includes("status: \"paid_pending_manual_fulfillment\""));
});
