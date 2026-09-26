import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(import.meta.dirname, "../supabase/migrations/20260926120000_connector_operations.sql"),
  "utf8",
);

test("connector operations are owner-readable but server-write only", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /using \(owner_id = auth\.uid\(\)\)/i);
  assert.match(migration, /revoke all on public\.connector_operations from anon, authenticated/i);
  assert.match(migration, /grant select on public\.connector_operations to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)[^;]*to authenticated/i);
});

test("connector operation identity and transitions are database enforced", () => {
  assert.match(migration, /unique \(owner_id, kind, idempotency_key\)/i);
  assert.match(migration, /request_sha256 text not null/i);
  assert.match(migration, /foreign key \(matter_id, owner_id\)/i);
  assert.match(migration, /connector operation identity is immutable/i);
  assert.match(migration, /revision must advance exactly once/i);
  assert.match(migration, /invalid connector operation transition/i);
});
