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
    "document_source_provenance",
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

test("document source provenance stores opaque origin metadata, not credentials or URLs", () => {
  assert.match(sql, /create table public\.document_source_provenance/i);
  assert.match(sql, /source_kind in \('local_upload', 'conversation_attachment', 'google_drive', 'mailmypdf_library', 'external_provider'\)/i);
  assert.match(sql, /use_role in \('primary', 'supporting'\)/i);
  assert.match(sql, /Provider credentials and fetch URLs are forbidden/i);
  assert.doesNotMatch(sql, /document_source_provenance[\s\S]{0,1200}(access_token|refresh_token|download_url)/i);
});

test("scheduled payment claim is valid server-only SQL and blocks competing checkout", () => {
  const claimStart = sql.indexOf("create or replace function public.claim_scheduled_mailing_payment");
  assert.ok(claimStart >= 0);
  const claim = sql.slice(claimStart);
  assert.match(claim, /set search_path = public, pg_temp\nas \$claim\$\ndeclare/i);
  assert.match(claim, /end;\n\$claim\$;/i);
  assert.match(claim, /o\.stripe_session_id is not null/i);
  assert.match(claim, /payment_execution_key/i);
  assert.match(claim, /p_amount_cents integer/i);
  assert.match(claim, /payment_amount_cents = coalesce\(payment_amount_cents, p_amount_cents\)/i);
  assert.match(claim, /grant execute on function public\.claim_scheduled_mailing_payment\(uuid, uuid, integer\)[\s\S]*to service_role/i);
  assert.doesNotMatch(claim, /grant execute[^;]*to (anon|authenticated)/i);
});

test("scheduled mail stores durable Stripe retry state without card data", () => {
  assert.match(sql, /payment_amount_cents integer/i);
  assert.match(sql, /stripe_payment_intent_id text/i);
  assert.match(sql, /payment_status text/i);
  assert.match(sql, /last_attempt_at timestamptz/i);
  assert.match(sql, /scheduled_mailings_payment_intent_uidx/i);

  const scheduledTable = sql.match(
    /create table public\.scheduled_mailings \(([\s\S]*?)\n\);/i,
  )?.[1];
  assert.ok(scheduledTable, "scheduled_mailings table definition is missing");
  assert.doesNotMatch(scheduledTable, /\b(card_number|pan|cvc|cvv)\b/i);
});

test("scheduled authorization identity is timestamped and immutable", () => {
  assert.match(sql, /payment_authorized_at timestamptz not null/i);
  assert.match(sql, /freeze_scheduled_mailing_authorization/i);
  assert.match(
    sql,
    /row\(new\.owner_id, new\.idempotency_key, new\.order_id, new\.batch_id,[\s\S]*new\.send_at, new\.timezone, new\.approval_sha256,[\s\S]*new\.approved_max_total_cents, new\.payment_authorized_at\)/i,
  );
  assert.match(sql, /Scheduled mailing authorization fields are immutable/i);
});

test("each mailing target can have at most one active schedule", () => {
  assert.match(sql, /scheduled_mailings_active_order_uidx[\s\S]*where order_id is not null and status in \('scheduled', 'processing'\)/i);
  assert.match(sql, /scheduled_mailings_active_batch_uidx[\s\S]*where batch_id is not null and status in \('scheduled', 'processing'\)/i);
});
