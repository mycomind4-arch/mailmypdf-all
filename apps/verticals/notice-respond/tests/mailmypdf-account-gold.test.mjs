import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("MailMyPDF Account integration is wired at the root", async () => {
  const root = await read("src/routes/__root.tsx");
  assert.match(root, /AuthProvider/);
  assert.match(root, /ProtectedContent/);
  assert.match(root, /\/dashboard/);
  assert.match(root, /\/account/);
  assert.match(root, /\/workflows\/analyze/);
});

test("Notice Respond auth page uses the shared MailMyPDF Account", async () => {
  const auth = await read("src/routes/auth.tsx");
  assert.match(auth, /MailMyPDF Account/);
  assert.match(auth, /signIn/);
  assert.match(auth, /signUp/);
  assert.match(auth, /signInWithMagicLink/);
  assert.match(auth, /resetPassword/);
  assert.doesNotMatch(auth, /Authentication coming soon/);
});

test("owner context is synchronized from authenticated sessions", async () => {
  const auth = await read("src/lib/auth.tsx");
  assert.match(auth, /setOwnerContext\(sessionUser\.id\)/);
  assert.match(auth, /clearOwnerContext\(\)/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
});

test("MailMyPDF document uploads preserve multipart boundaries in the shared client", async () => {
  const adapter = await read("src/platform/mailing-client/index.ts");
  const shared = await read("../../../packages/mailing-client/src/index.ts");
  assert.match(adapter, /from "@mailmypdf\/mailing-client"/);
  assert.match(shared, /new FormData\(\)/);
  assert.match(shared, /\/api\/v1\/documents/);
  assert.match(shared, /fetch\(/);
  assert.match(shared, /init\.body instanceof FormData/);
  assert.match(shared, /Only set Content-Type for non-FormData bodies/);
});

test("server auth endpoints use native TanStack server handlers", async () => {
  const status = await read("src/routes/api/auth/status.ts");
  const admin = await read("src/routes/api/admin/health.ts");
  const guard = await read("src/lib/auth-guard.ts");
  assert.match(status, /createFileRoute\("\/api\/auth\/status"\)/);
  assert.match(status, /server:\s*\{\s*handlers:/s);
  assert.match(admin, /createFileRoute\("\/api\/admin\/health"\)/);
  assert.match(admin, /requireAdmin/);
  assert.match(guard, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(guard, /Administrative access required/);
});

test("account page and dashboard require the shared account context", async () => {
  const account = await read("src/routes/account.tsx");
  const dashboard = await read("src/routes/dashboard.tsx");
  assert.match(account, /useAuth/);
  assert.match(account, /MailMyPDF Account/);
  assert.match(dashboard, /useAuth/);
  assert.match(dashboard, /Sign in to view your cases/);
  assert.doesNotMatch(dashboard, /Connect Supabase to persist cases across sessions/);
});

test("Gold audit records the remaining vertical gaps", async () => {
  const audit = await read("GOLD_VERTICAL_AUDIT.md");
  assert.match(audit, /Server-side route\/API boundary/);
  assert.match(audit, /Document upload integration/);
  assert.match(audit, /Admin\/RBAC/);
  assert.match(audit, /AI control-plane configuration/);
});
