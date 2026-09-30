import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

test("factory job persistence stays admin-only and revision-guarded", () => {
  const migration = read("supabase/migrations/20260930210000_factory_jobs.sql");

  assert.match(migration, /alter table public\.factory_jobs enable row level security/);
  assert.match(migration, /alter table public\.factory_job_events enable row level security/);
  assert.match(migration, /revoke all on table public\.factory_jobs from public, anon, authenticated/);
  assert.match(migration, /revoke all on table public\.factory_job_events from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.create_factory_job[\s\S]*?to service_role/);
  assert.match(migration, /grant execute on function public\.transition_factory_job[\s\S]*?to service_role/);
  assert.match(migration, /and revision = p_expected_revision/);
  assert.match(migration, /Factory job revision conflict/);
  assert.match(migration, /unique \(job_id, revision\)/i);
});

test("factory runner persists every transition through the atomic RPC", () => {
  const server = read("src/studio/factory-job.server.ts");

  assert.match(server, /rpc\("create_factory_job"/);
  assert.match(server, /rpc\("transition_factory_job"/);
  assert.match(server, /restoreFactoryJobSnapshot/);
  assert.match(server, /current\.revision \+ 1/);
  assert.match(server, /Factory job changed concurrently/);
  assert.match(server, /job\.stage === "intake"/);
  assert.match(server, /job\.stage === "match"/);
  assert.match(server, /job\.stage === "certify"/);
  assert.match(server, /job\.stage === "build"/);
  assert.match(server, /job\.stage === "acceptance"/);
  assert.match(server, /createFactoryAcceptanceArtifact/);
  assert.match(server, /checkFactoryAcceptance/);
  assert.doesNotMatch(server, /prepare_checkout|charge|submit.*mail|lob/i);
});

test("persistent factory endpoints require verified administrator access", () => {
  const routes = [
    "src/routes/api/studio/workflows/jobs/index.ts",
    "src/routes/api/studio/workflows/jobs/$id/index.ts",
    "src/routes/api/studio/workflows/jobs/$id/run.ts",
    "src/routes/api/studio/workflows/jobs/$id/review.ts",
    "src/routes/api/studio/workflows/jobs/$id/cancel.ts",
  ];

  for (const relative of routes) {
    const source = read(relative);
    assert.match(source, /adminFactoryAccess\(request\)/, relative);
    assert.match(source, /if \(access\.error\) return access\.error/, relative);
    assert.doesNotMatch(source, /studioAccessError\(/, relative);
  }
});

test("Studio factory UI creates durable jobs and keeps review explicit", () => {
  const page = read("src/components/WorkflowFactoryPage.tsx");

  assert.match(page, /\/api\/studio\/workflows\/jobs\//);
  assert.match(page, /Start factory job/);
  assert.match(page, /Approve next stage/);
  assert.match(page, /Canonical workflow ID/);
  assert.match(page, /Factory family/);
  assert.match(page, /No code is published automatically/);
  assert.match(page, /Factory job queue/);
  assert.match(page, /Check acceptance/);
  assert.match(page, /Factory pull request/);
  assert.doesNotMatch(page, /prepare_checkout|submit_mail_order|charge_card/);
});


test("factory GitHub executor is isolated, non-destructive, and CI-gated", () => {
  const source = read("src/studio/factory-github.server.ts");

  assert.match(source, /getBranchSha/);
  assert.match(source, /canonical-workflows\.json/);
  assert.match(source, /buildReviewedFactoryRepositoryPlan/);
  assert.match(source, /refuses? to overwrite|refuse.*overwrite/i);
  assert.match(source, /createBranch/);
  assert.match(source, /createTree/);
  assert.match(source, /createPullRequest/);
  assert.match(source, /Factory generated workflow verification/);
  assert.match(source, /Shared capability verification/);
  assert.match(source, /Records Request verification/);
  assert.match(source, /Public workflow landing gate/);
  assert.match(source, /Workspace UI verification/);
  assert.doesNotMatch(source, /mergePullRequest|deployProduction|prepare_checkout|submit.*mail|charge/i);
});


test("generated workflow verification checks the canonical Records Request chat surface", () => {
  const source = read("../scripts/verify-factory-workflow.ts");
  assert.match(source, /canonicalChatFactoryReport/);
  assert.match(source, /policyFamily === "records-request"/);
  assert.match(source, /!entry\.chatExecutable/);
  assert.doesNotMatch(source, /report\.executable/);
});
