import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("authenticated document upload uses the MailMyPDF platform boundary", async () => {
  const source = await read("src/routes/api/documents.ts");
  assert.match(source, /createFileRoute\("\/api\/documents"\)/);
  assert.match(source, /server:\s*\{\s*handlers:/s);
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /request\.formData\(\)/);
  assert.match(source, /uploadDocument\(file\)/);
});

test("case listing is server-authorized and scoped to the authenticated owner", async () => {
  const source = await read("src/routes/api/cases/index.ts");
  assert.match(source, /requireAuthenticatedUser/);
  assert.match(source, /Bearer/);
  assert.match(source, /\.eq\("owner_id", user\.id\)/);
  assert.match(source, /createFileRoute\("\/api\/cases\/?"\)/);
});

test("admin health has a server-side authorization boundary", async () => {
  const source = await read("src/routes/api/admin/health.ts");
  assert.match(source, /requireAdmin/);
  assert.match(source, /createFileRoute\("\/api\/admin\/health"\)/);
  // The admin boundary is implemented in auth-guard.ts, which the health route imports.
  // Verify that the guard module contains the real admin check.
  const guardSource = await read("src/lib/auth-guard.ts");
  assert.match(guardSource, /SUPABASE_SERVICE_ROLE_KEY|user_roles/);
});
