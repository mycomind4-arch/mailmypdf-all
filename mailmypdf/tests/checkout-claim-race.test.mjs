import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("concurrent direct-mail checkouts reuse the winning Stripe session without expiring it", async () => {
  const code = await readFile(new URL("../src/lib/orders.functions.ts", import.meta.url), "utf8");
  const start = code.indexOf("export const createCheckoutForOrder");
  const end = code.indexOf("// ── Create Order from PDF Upload", start);
  assert.ok(start >= 0 && end > start);
  const checkout = code.slice(start, end);
  assert.match(checkout, /idempotencyKey: await directCheckoutAttemptKey\\(order\\.id, replacedSessionId\\)/);
  assert.match(checkout, /claimQuery\\.is\\("stripe_session_id", null\\)/);
  assert.match(checkout, /claimQuery\\.eq\\("stripe_session_id", replacedSessionId\\)/);
  assert.match(checkout, /replacedSessionId = existingSession\\.id/);
  assert.match(checkout, /\.eq\("lookup_token", data\.token\)/);
  assert.match(checkout, /winner\.stripe_session_id === session\.id/);
  assert.match(checkout, /return \{ clientSecret: actual\.client_secret \}/);
  assert.match(checkout, /actual\.metadata\?\.orderId !== order\.id/);
  assert.doesNotMatch(checkout, /stripe\.checkout\.sessions\.expire\(session\.id\)/);
  assert.match(checkout, /winner\.status !== "draft"/);
});
