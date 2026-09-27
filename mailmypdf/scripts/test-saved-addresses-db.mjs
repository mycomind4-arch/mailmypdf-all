// Synthetic, network-isolated PostgreSQL integration test. Never reads .env or
// production backups. Requires the image to already exist locally.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

const name = `mailmypdf-addresses-test-${randomUUID()}`;
const image = "public.ecr.aws/supabase/postgres:17.6.1.155";
function docker(args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = ""; let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(err || out || `Docker exit ${code}`)));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
const sql = (input) => docker(["exec", "-i", name, "psql", "-h", "/tmp", "-U", "postgres", "-At", "-v", "ON_ERROR_STOP=1"], input);
const ownerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const write = (owner, id, label, defaultSender) => `select public.write_saved_mailing_address('${owner}','${id}',0,'sender','${label}','{"line1":"1 Main St"}','{"status":"verified"}',${defaultSender},false);`;
let created = false;
try {
  await docker(["run", "-d", "--pull", "never", "--name", name, "--network", "none", "--user", "postgres", "--entrypoint", "/bin/bash", image,
    "-c", "initdb -D /tmp/address-test-db -A trust && postgres -D /tmp/address-test-db -k /tmp"]);
  created = true;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { await sql("select 1;"); ready = true; break; } catch { await setTimeout(250); }
  }
  assert.ok(ready, "isolated database did not start");
  await sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to authenticated;`);
  await sql(await readFile(new URL("../supabase/migrations/20260928010000_saved_mailing_addresses.sql", import.meta.url), "utf8"));
  await sql(await readFile(new URL("../tests/sql/saved-mailing-addresses.sql", import.meta.url), "utf8"));
  // Both create different defaults concurrently; one owner can retain only one.
  await Promise.all([3, 4].map((n) => sql(`begin; ${write(ownerA, `10000000-0000-4000-8000-00000000000${n}`, `Concurrent${n}`, true)} select pg_sleep(0.15); commit;`)));
  assert.equal((await sql(`select count(*) from public.saved_mailing_addresses where owner_id='${ownerA}' and is_default;`)).trim(), "1");
  // A UUID collision between different owners must not become an upsert leak.
  const collisionId = "10000000-0000-4000-8000-000000000005";
  const results = await Promise.allSettled([ownerA, ownerB].map((owner, i) =>
    sql(`begin; ${write(owner, collisionId, `Owner${i}`, false)} select pg_sleep(0.15); commit;`)));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await sql(`select count(*) from public.saved_mailing_addresses where id='${collisionId}' and ((owner_id='${ownerA}' and label='Owner0') or (owner_id='${ownerB}' and label='Owner1'));`)).trim(), "1");
  console.log("PASS: migration, RLS, server-only writes, retries, revisions, archival, concurrent defaults and cross-owner UUID collision.");
} finally {
  if (created) await docker(["rm", "-f", name]);
}
