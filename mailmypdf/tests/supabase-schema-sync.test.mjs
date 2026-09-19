import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ═══════════════════════════════════════════════════════════
   Supabase Schema Sync

   src/integrations/supabase/types.ts described only 4 of the 21
   tables the migrations create. Every query against a missing
   table produced a PostgREST type error, and 110 of the app's
   169 TypeScript errors came from that single gap — enough noise
   to hide the genuine ones underneath it.

   Worse than the noise: an undeclared table types as `never`, so
   the compiler cannot check what we read from or write to it.

   These tests fail the build when a new migration adds a table,
   column, or security-core RPC that the generated types do not
   describe. Regenerate the types, do not silence the test.
   ═══════════════════════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");
const TYPES = join(ROOT, "src", "integrations", "supabase", "types.ts");

const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS, f), "utf-8"))
  .join("\n");

const types = readFileSync(TYPES, "utf-8");

function declaredTables() {
  const tablesBlock = types.slice(types.indexOf("    Tables: {"), types.indexOf("    Views: {"));
  return new Set([...tablesBlock.matchAll(/^ {6}([a-z_]+): \{$/gm)].map((m) => m[1]));
}

const migrationTables = [
  ...new Set([...sql.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_]+)/gi)].map((m) => m[1])),
].sort();

describe("Supabase schema sync", () => {
  test("migrations were found", () => {
    assert.ok(migrationTables.length >= 20, `expected the migration set to define tables, found ${migrationTables.length}`);
  });

  test("every migration table is described in the generated types", () => {
    const declared = declaredTables();
    const missing = migrationTables.filter((t) => !declared.has(t));
    assert.deepEqual(
      missing,
      [],
      `types.ts is missing ${missing.length} table(s) the migrations create: ${missing.join(", ")}. ` +
        `Undeclared tables type as never, so queries against them cannot be checked.`,
    );
  });

  test("columns added by ALTER TABLE are described", () => {
    const added = [...sql.matchAll(/alter table\s+(?:if exists\s+)?(?:public\.)?([a-z_]+)\s+add column(?: if not exists)?\s+([a-z_]+)/gi)]
      .map((m) => ({ table: m[1], column: m[2] }));
    assert.ok(added.length > 0, "expected at least one ALTER TABLE ADD COLUMN in the migrations");

    const missing = [];
    for (const { table, column } of added) {
      const start = types.indexOf(`      ${table}: {`);
      if (start === -1) { missing.push(`${table}.${column} (table absent)`); continue; }
      const block = types.slice(start, types.indexOf("\n      }", start));
      if (!new RegExp(`^ {10}${column}\\??:`, "m").test(block)) missing.push(`${table}.${column}`);
    }
    assert.deepEqual(missing, [], `types.ts is missing migrated column(s): ${missing.join(", ")}`);
  });

  test("security-core RPCs the app calls are typed", () => {
    const functionsBlock = types.slice(types.indexOf("    Functions: {"), types.indexOf("    Enums: {"));
    for (const fn of [
      "claim_secure_documents_for_scan",
      "claim_secure_documents_for_deletion",
      "request_secure_document_deletion",
    ]) {
      assert.ok(
        new RegExp(`^ {6}${fn}: \\{`, "m").test(functionsBlock),
        `types.ts does not describe the ${fn} RPC; .rpc("${fn}") cannot be type-checked`,
      );
    }
  });

  test("the secure document vault is fully typed", () => {
    for (const table of ["secure_documents", "document_consents", "security_events"]) {
      assert.ok(declaredTables().has(table), `${table} must be described in types.ts`);
    }
    const start = types.indexOf("      secure_documents: {");
    const block = types.slice(start, types.indexOf("\n      }", start));
    for (const column of ["owner_id", "security_status", "sha256", "retention_until", "deletion_requested_at"]) {
      assert.ok(new RegExp(`^ {10}${column}:`, "m").test(block), `secure_documents.${column} must be typed`);
    }
  });
});
