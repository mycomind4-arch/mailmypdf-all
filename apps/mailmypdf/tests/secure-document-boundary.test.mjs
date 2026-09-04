import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

describe("secure document boundary", () => {
  test("verifies the user and never uses a privileged key", async () => {
    const source = await read("src/lib/secure-core/auth.server.ts");
    assert.match(source, /auth\.getUser\(token\)/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
  });

  test("validates before quarantine and records explicit consent", async () => {
    const source = await read("src/lib/secure-core/document-intake.server.ts");
    const validateAt = source.indexOf("validateDocument(");
    const uploadAt = source.indexOf(".upload(");
    assert.ok(validateAt >= 0 && uploadAt > validateAt);
    assert.match(source, /if \(!input\.consent\)/);
    assert.match(source, /security_status: "quarantined"/);
    assert.match(source, /storagePath = `\$\{context\.user\.id\}/);
  });

  test("database and storage policies enforce owner isolation", async () => {
    const migration = await read("supabase/migrations/20260904120000_secure_document_vault.sql");
    assert.match(migration, /alter table public\.secure_documents enable row level security/i);
    assert.match(migration, /owner_id = auth\.uid\(\)/i);
    assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/i);
    assert.match(migration, /No authenticated-user SELECT policy exists on storage\.objects/);
  });

  test("route exposes intake only, not analysis or fulfillment", async () => {
    const route = await read("src/routes/api/v2/documents/index.ts");
    assert.match(route, /return json\(202/);
    assert.doesNotMatch(route, /openai|anthropic|lob|stripe/i);
  });

  test("scanner claims work atomically and fails closed", async () => {
    const scanner = await read("src/lib/secure-core/scanner.server.ts");
    const migration = await read("supabase/migrations/20260904120000_secure_document_vault.sql");
    assert.match(scanner, /computeSha256\(content\) !== document\.sha256/);
    assert.match(scanner, /result\.status !== "clean" && result\.status !== "infected"/);
    assert.match(scanner, /document\.deletion_requested_at \? "deleting" : "quarantined"/);
    assert.match(scanner, /url\.protocol !== "https:"/);
    assert.match(migration, /for update skip locked/i);
    assert.match(migration, /grant execute on function public\.claim_secure_documents_for_scan\(integer\) to service_role/i);
  });

  test("downloads require owner and clean status with a short grant", async () => {
    const download = await read("src/routes/api/v2/documents/$id/download.ts");
    assert.match(download, /DOWNLOAD_TTL_SECONDS = 60/);
    assert.equal((download.match(/\.eq\("owner_id", context\.user\.id\)/g) ?? []).length, 2);
    assert.equal((download.match(/\.eq\("security_status", "clean"\)/g) ?? []).length, 2);
    assert.match(download, /createSignedUrl\(document\.storage_path, DOWNLOAD_TTL_SECONDS\)/);
    assert.match(download, /"Cache-Control": "no-store"/);
    assert.match(download, /event_type: "document\.download_grant_created"/);
    assert.match(download, /metadata: \{ expires_in_seconds: DOWNLOAD_TTL_SECONDS \}/);
    assert.doesNotMatch(download, /metadata: \{[^}]*signedUrl/);
  });

  test("retention hides expired documents before retryable object deletion", async () => {
    const retention = await read("src/lib/secure-core/retention.server.ts");
    const migration = await read("supabase/migrations/20260904120000_secure_document_vault.sql");
    assert.match(migration, /set security_status = 'deleting'/i);
    assert.match(migration, /for update skip locked/i);
    assert.match(migration, /or security_status = 'deleting'/i);
    assert.match(migration, /grant execute on function public\.claim_secure_documents_for_deletion\(integer\) to service_role/i);
    assert.ok(retention.indexOf(".remove([document.storage_path])") < retention.indexOf('security_status: "deleted"'));
    assert.match(retention, /original_filename: null/);
    assert.match(retention, /sha256: null/);
    assert.match(retention, /storage_path: `\$\{document\.owner_id\}\/deleted\/\$\{document\.id\}`/);
  });

  test("immutable consent stores a constrained code rather than free-form sensitive text", async () => {
    const intake = await read("src/lib/secure-core/document-intake.server.ts");
    const migration = await read("supabase/migrations/20260904120000_secure_document_vault.sql");
    assert.match(intake, /\^\[a-z0-9\]\[a-z0-9\._-\]\{2,63\}\$/);
    assert.match(intake, /purpose: purposeCode/);
    assert.match(migration, /purpose ~ '\^\[a-z0-9\]\[a-z0-9\._-\]\{2,63\}\$'/);
  });

  test("owner deletion revokes access and safely crosses an active scan", async () => {
    const route = await read("src/routes/api/v2/documents/$id/index.ts");
    const scanner = await read("src/lib/secure-core/scanner.server.ts");
    const migration = await read("supabase/migrations/20260904120000_secure_document_vault.sql");
    assert.match(route, /requireAuthenticatedUser\(request\)/);
    assert.match(route, /request_secure_document_deletion/);
    assert.match(route, /return Response\.json\(\{ id: params\.id, status: "deleting" \}, \{ status: 202/);
    assert.match(migration, /and owner_id = auth\.uid\(\)/i);
    assert.match(migration, /when security_status = 'scanning' then 'scanning'/i);
    assert.match(scanner, /document\.deletion_requested_at\s*\? "deleting"/);
    assert.match(scanner, /document\.deletion_requested_at \? "deleting" : "quarantined"/);
  });

  test("secure metadata export is owner-scoped, bounded, downloadable, and audited", async () => {
    const route = await read("src/routes/api/v2/privacy/export.ts");
    assert.match(route, /requireAuthenticatedUser\(request\)/);
    assert.equal((route.match(/\.eq\("owner_id", context\.user\.id\)/g) ?? []).length, 3);
    assert.match(route, /EXPORT_LIMIT = 1_001/);
    assert.match(route, /ASYNC_EXPORT_REQUIRED/);
    assert.match(route, /account\.secure_data_exported/);
    assert.match(route, /Content-Disposition/);
    assert.match(route, /"Cache-Control": "no-store"/);
  });
});
