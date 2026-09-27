import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../scripts/production-readiness.mjs", import.meta.url), "utf8");
const project = "canonical-project";
async function run(overrides = {}, missingSaved = false) {
  const calls = []; const lines = [];
  const process = { env: { SUPABASE_URL: `https://${project}.supabase.co`,
    SUPABASE_SECRET_KEY: "private-test-secret-never-print", MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF: project,
    ...overrides }, argv: ["node", "script", "--live"], exitCode: 0 };
  await runInNewContext(`(async () => {${source.replace(/^#!.*\n/, "")}\n})()`, {
    process, URL, AbortSignal,
    console: { log: (...args) => lines.push(args.join(" ")) },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (missingSaved && url.includes("saved_mailing_addresses")) return new Response(null, { status: 404 });
      return Response.json(url.endsWith("/storage/v1/bucket") ? [{name:"secure-documents"},{name:"order-pdfs"}] : []);
    },
  });
  return { calls, output: lines.join("\n"), exitCode: process.exitCode };
}

test("preflight refuses credentialed probes without an exact canonical HTTPS origin", async () => {
  for (const SUPABASE_URL of ["https://wrong.supabase.co", "http://canonical-project.supabase.co", "https://canonical-project.supabase.co.attacker.test", "https://canonical-project.supabase.co/redirect", "https://canonical-project.supabase.co?next=external", "https://user:pass@canonical-project.supabase.co"]) {
    const result = await run({ SUPABASE_URL });
    assert.equal(result.calls.length, 0, SUPABASE_URL);
    assert.match(result.output, /skipped — confirm the exact HTTPS/);
    assert.equal(result.exitCode, 1);
  }
  assert.equal((await run({ MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF: "" })).calls.length, 0);
});

test("preflight checks current schema with bounded non-redirecting read requests", async () => {
  const result = await run();
  assert.ok(result.calls.some(call => call.url.includes("saved_mailing_addresses")));
  assert.ok(result.calls.some(call => call.url.includes("connector_operations?select=id,owner_id,state,revision")));
  for (const { url, options } of result.calls) {
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    assert.equal(options.method, undefined, "all probes must remain GET");
    assert.ok(url.endsWith("limit=0") || url.endsWith("/storage/v1/bucket"));
  }
  assert.doesNotMatch(result.output, /private-test-secret/);
  assert.match(result.output, /FAIL\s+MAILMYPDF_CONNECTOR_JOB_SECRET/);
});

test("missing saved-address migration fails launch preflight", async () => {
  const result = await run({}, true);
  assert.match(result.output, /FAIL\s+Supabase schema: saved mailing addresses\s+HTTP 404/);
  assert.equal(result.exitCode, 1);
});
