import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("verified Stripe payment updates only the still-current checkout session", async () => {
  const code = await readFile(
    new URL("../src/routes/api/public/payments/webhook.ts", import.meta.url),
    "utf8",
  );
  const transition = code.indexOf('status: "paid_pending_manual_fulfillment"');
  assert.ok(transition > 0);
  const statement = code.slice(transition, transition + 1200);
  assert.ok(statement.includes('.eq("id", orderId)'), "must bind order");
  assert.ok(statement.includes('.eq("status", "draft")'), "must bind unpaid state");
  assert.ok(statement.includes('.eq("stripe_session_id", session.id)'), "must reject superseded session payments");
});
