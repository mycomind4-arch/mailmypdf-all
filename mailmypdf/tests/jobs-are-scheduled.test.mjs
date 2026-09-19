import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const repoRoot = new URL("../../../", import.meta.url);
const WORKFLOW = new URL(".github/workflows/secure-core-jobs.yml", repoRoot);

/* ═══════════════════════════════════════════════════════════
   The secure-core jobs must actually be invoked

   Both jobs had endpoints and nothing called them. The Worker's
   own cron covers proof-processor only, and while the build sat
   on the Pages preset it fired nothing at all, because Pages has
   no scheduled events. Without an external schedule, uploaded
   documents stay quarantined forever and expired documents are
   never deleted — the retention promise silently not kept.
   ═══════════════════════════════════════════════════════════ */

describe("scheduling", () => {
  test("a schedule exists for the secure-core jobs", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    assert.match(yaml, /^\s*schedule:/m, "the workflow must run on a schedule");
    assert.match(yaml, /cron: "\*\/10 \* \* \* \*"/, "scanning must run frequently");
    assert.match(yaml, /cron: "17 3 \* \* \*"/, "retention must run daily");
  });

  test("both endpoints are actually called", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    assert.match(yaml, /\/api\/internal\/scan-documents/);
    assert.match(yaml, /\/api\/internal\/purge-secure-documents/);
  });

  test("each job authenticates with its own secret", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    // Scoped to each job block: the header comment names both secrets.
    const scanBlock = yaml.slice(yaml.indexOf("\n  scan:"), yaml.indexOf("\n  purge:"));
    const purgeBlock = yaml.slice(yaml.indexOf("\n  purge:"));

    assert.match(scanBlock, /MAILMYPDF_SCANNER_JOB_SECRET/);
    assert.match(purgeBlock, /MAILMYPDF_RETENTION_JOB_SECRET/);
    // The jobs are separately authorised; one secret must not open both.
    assert.doesNotMatch(scanBlock, /MAILMYPDF_RETENTION_JOB_SECRET/);
    assert.doesNotMatch(purgeBlock, /MAILMYPDF_SCANNER_JOB_SECRET/);
  });

  test("a failing job fails the run rather than passing quietly", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    // Count only the curl invocations, not the comment explaining them.
    const failFlags = yaml
      .split("\n")
      .filter((line) => line.includes("--fail-with-body") && !line.trim().startsWith("#"));
    assert.equal(failFlags.length, 2, "both curls must treat an error response as a failure");
    assert.match(yaml, /set -euo pipefail/);
  });

  test("secrets are read from the secret store, never inlined", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    assert.doesNotMatch(yaml, /Bearer [A-Za-z0-9]{16,}/, "no literal token may appear in the workflow");
    assert.match(yaml, /\$\{\{ secrets\.MAILMYPDF_SCANNER_JOB_SECRET \}\}/);
  });

  test("an unconfigured repository skips instead of failing every ten minutes", async () => {
    const yaml = await readFile(WORKFLOW, "utf8");
    assert.match(yaml, /configured=false/);
    assert.match(yaml, /steps\.config\.outputs\.configured == 'true'/);
  });
});

describe("job endpoints that still have no schedule", () => {
  test("every unscheduled internal job is a known and accepted gap", async () => {
    const dir = new URL("../src/routes/api/internal/", import.meta.url);
    const endpoints = (await readdir(dir))
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(/\.ts$/, ""))
      .filter((name) => name !== "health");

    // Coverage is measured from actual call sites, not from any mention of a
    // job name — a comment referring to a job must not read as scheduling it.
    const yaml = await readFile(WORKFLOW, "utf8");
    const serverEntry = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
    const calledIn = (source) =>
      new Set([...source.matchAll(/\/api\/internal\/([a-z-]+)/g)].map((m) => m[1]));

    const byWorkflow = calledIn(yaml);
    const byWorkerCron = calledIn(serverEntry);
    const covered = new Set([...byWorkflow, ...byWorkerCron]);

    assert.ok(byWorkflow.has("scan-documents"), "the workflow must call the scanner job");
    assert.ok(byWorkflow.has("purge-secure-documents"), "the workflow must call the retention job");
    assert.ok(byWorkerCron.has("proof-processor"), "the Worker cron must call the proof processor");

    // These dispatch webhooks and submit to a mailing provider, so turning them
    // on is a business decision rather than a code one. This list records that,
    // and fails if a new job appears unnoticed.
    const unscheduled = endpoints.filter((name) => !covered.has(name)).sort();
    assert.deepEqual(unscheduled, [
      "cleanup-drafts",
      "process-scheduled",
      "proof-webhook-retries",
      "proof-window-expiry",
    ]);
  });
});
