import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

describe("shared notification capability", () => {
  test("transactional order email uses the shared idempotent runner", async () => {
    const source = await read("src/lib/email.server.ts");
    assert.match(source, /sendNotificationOnce/);
    assert.match(source, /createNotificationDeliveryStore/);
    assert.match(source, /order:\$\{orderId\}:payment-confirmation/);
    assert.match(source, /order:\$\{orderId\}:mailed/);
    assert.doesNotMatch(source, /api\.resend\.com/);
  });

  test("notification claims are atomic at the database boundary", async () => {
    const sql = await read("supabase/migrations/20260916054500_notification_deliveries.sql");
    assert.match(sql, /idempotency_key text primary key/i);
    assert.match(sql, /on conflict \(idempotency_key\) do update/i);
    assert.match(sql, /status = 'sending'/i);
    assert.match(sql, /grant execute[^;]+service_role/is);
    assert.match(sql, /revoke all[^;]+anon, authenticated/is);
  });

  test("provider errors do not reflect third-party response bodies", async () => {
    const source = await read("src/providers/adapters/resend-adapter.ts");
    assert.match(source, /await res\.body\?\.cancel/);
    assert.match(source, /error: `Resend \$\{res\.status\}`/);
    assert.doesNotMatch(source, /text\.slice\(0, 200\)/);
    assert.match(source, /redirect: "error"/);
  });
});
