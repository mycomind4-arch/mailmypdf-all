import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const authGuardSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/auth-guard.ts"),
  "utf8",
);

test("resolveUserRole never grants a role from client-editable user_metadata", () => {
  // user_metadata is editable by the signed-in user themselves via the
  // standard Supabase client SDK (auth.updateUser) — trusting it for role
  // resolution lets any customer self-grant admin. The only legitimate
  // source of truth is the server-side user_roles table (RLS-protected).
  assert.doesNotMatch(authGuardSource, /metadata\??\.role/);
  assert.doesNotMatch(authGuardSource, /metadata\??\.is_admin/);
  assert.match(authGuardSource, /from\(["']user_roles["']\)/);
});

test("resolveUserRole is not passed the caller's user_metadata", () => {
  assert.doesNotMatch(authGuardSource, /resolveUserRole\([^)]*user_metadata/);
});
