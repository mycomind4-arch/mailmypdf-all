import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20260928023000_mailing_orchestration_foundation.sql", import.meta.url),
  "utf8",
);

test("mailing orchestration migration creates server-authoritative shared tables", () => {
  for (const table of [
    "account_billing_profiles",
    "mailing_batches",
    "mailing_batch_items",
    "scheduled_mailings",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
});

test("billing profile stores only tokenized payment references and remains server-only", () => {
  assert.match(sql, /stripe_customer_id text/i);
  assert.match(sql, /default_payment_method_id text/i);
  assert.match(sql, /Never stores PAN\/CVC/i);
  assert.match(sql, /revoke all on public\.account_billing_profiles from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant select on public\.account_billing_profiles to authenticated/i);
});

test("batch and scheduled mail are readable by owners but not client-writable", () => {
  assert.match(sql, /create policy mailing_batches_read_owned[\s\S]*owner_id = auth\.uid\(\)/i);
  assert.match(sql, /create policy mailing_batch_items_read_owned[\s\S]*owner_id = auth\.uid\(\)/i);
  assert.match(sql, /create policy scheduled_mailings_read_owned[\s\S]*owner_id = auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/i);
});

test("schedule targets exactly one order or batch and indexes only due active work", () => {
  assert.match(sql, /check \(\(order_id is not null\) <> \(batch_id is not null\)\)/i);
  assert.match(sql, /scheduled_mailings_due_idx[\s\S]*where status = 'scheduled'/i);
});

test("approved batch recipient identity is immutable", () => {
  assert.match(sql, /freeze_approved_mailing_batch_items/i);
  assert.match(sql, /Approved mailing batch recipient details are immutable/i);
  assert.match(sql, /Cannot add recipients to an approved mailing batch/i);
  assert.match(sql, /Cannot remove recipients from an approved mailing batch/i);
});
