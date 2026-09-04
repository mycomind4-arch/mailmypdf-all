import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const repoRoot = new URL("../../../", import.meta.url);
const WORKFLOW = new URL(".github/workflows/secure-core-jobs.yml", repoRoot);

/* ═══════════════════════════════════════════════════════════
   The secure-core jobs must actually be invoked

   Both jobs had endpoints and nothing called them. The deploy
   target is Cloudflare Pages, which has no cron triggers, so
   without an external schedule uploaded documents stay
   quarantined forever and expired documents are never deleted —
   the retention promise silently not kept.
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

    const yaml = await readFile(WORKFLOW, "utf8");
    const unscheduled = endpoints.filter((name) => !yaml.includes(name));

    // These have side effects — dispatching webhooks, submitting to a mailing
    // provider — so turning them on is a business decision, not a code one.
    // This list is a record of that, and fails if a new job appears unnoticed.
    assert.deepEqual(unscheduled.sort(), [
      "cleanup-drafts",
      "process-scheduled",
      "proof-processor",
      "proof-webhook-retries",
      "proof-window-expiry",
    ]);
  });
});
