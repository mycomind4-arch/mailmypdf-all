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
  assert.doesNotMatch(page, /prepare_checkout|submit_mail_order|charge_card/);
});


test("factory machine executors are local-admin-only and separate from remote orchestration", () => {
  const buildRoute = read("src/routes/api/studio/workflows/jobs/$id/build.ts");
  const publishRoute = read("src/routes/api/studio/workflows/jobs/$id/publish.ts");
  const access = read("src/studio/access.ts");

  assert.match(buildRoute, /localAdminFactoryAccess\(request\)/);
  assert.match(buildRoute, /executePersistentFactoryAcceptance/);
  assert.match(publishRoute, /localAdminFactoryAccess\(request\)/);
  assert.match(publishRoute, /publishPersistentFactoryProposal/);
  assert.match(access, /Factory machine execution is available only on the local development server/);
  assert.match(access, /return adminFactoryAccess\(request\)/);
});

test("supervised executor isolates proposal work and has no publication/provider side effects", () => {
  const executor = read("src/studio/factory-build-executor.server.ts");

  assert.match(executor, /git\(rootDir, \["fetch", "origin", project\.defaultBranch\]\)/);
  assert.match(executor, /"worktree",\s*"add",\s*"-b"/);
  assert.match(executor, /expectedChangedPath/);
  assert.match(executor, /Factory build produced unexpected paths/);
  assert.match(executor, /generated-profile-specs\.json/);
  assert.match(executor, /materialize-workflow-spec\.ts/);
  assert.match(executor, /verify-factory-workflow\.ts/);
  assert.match(executor, /@mailmypdf\/workflows", "test"/);
  assert.match(executor, /@mailmypdf\/records-request", "test:acceptance"/);
  assert.match(executor, /recordPersistentFactoryBuildArtifact/);
  assert.match(executor, /recordPersistentFactoryAcceptance/);

  assert.doesNotMatch(executor, /git\([^\n]*\["push"/);
  assert.doesNotMatch(executor, /merge_pull_request|create_pull_request|wrangler deploy|publishProjectToCloudflare/);
  assert.doesNotMatch(executor, /prepare_checkout|paymentIntents\.create|submit.*mail|lob/i);
});

test("generated Records Request profiles stay separate from hand-authored core profiles", () => {
  const profiles = read("../packages/workflows/src/domain-packs/records-request/profiles.ts");
  const generated = read("../packages/workflows/src/domain-packs/records-request/generated-profiles.ts");
  const runtime = read("../packages/workflows/src/domain-packs/records-request/runtime-policy.ts");

  assert.match(profiles, /CORE_RECORDS_REQUEST_WORKFLOW_PROFILES/);
  assert.match(profiles, /GENERATED_RECORDS_REQUEST_WORKFLOW_PROFILES/);
  assert.match(generated, /machine-owned/);
  assert.match(runtime, /RECORDS_REQUEST_WORKFLOW_PROFILES\.map/);
});

test("Studio exposes supervised execution evidence and explicit PR publication", () => {
  const page = read("src/components/WorkflowFactoryPage.tsx");

  assert.match(page, /Run local supervised build/);
  assert.match(page, /Build artifact/);
  assert.match(page, /Nothing has been pushed or published yet/);
  assert.match(page, /Create GitHub PR/);
  assert.match(page, /Publication artifact/);
  assert.match(page, /Proposal published for review only/);
  assert.match(page, /Notice Response recipe saved/);
});


test("factory publication pushes only the accepted commit and never merges or deploys", () => {
  const executor = read("src/studio/factory-publication-executor.server.ts");

  assert.match(executor, /refs\/heads\/\$\{branch\}/);
  assert.match(executor, /Local factory proposal branch moved after acceptance/);\n  assert.match(executor, /default branch moved after factory acceptance/);
  assert.match(executor, /ls-remote/);
  assert.match(executor, /"push"/);
  assert.match(executor, /findOpenPullRequestByHead/);
  assert.match(executor, /createPullRequest/);
  assert.match(executor, /recordPersistentFactoryPublication/);
  assert.doesNotMatch(executor, /mergePullRequest|merge_pull_request|wrangler deploy|publishProjectToCloudflare/);
  assert.doesNotMatch(executor, /prepare_checkout|paymentIntents\.create|submit.*mail|lob/i);
});

test("generated workflow verifier certifies the actual chat-executable field", () => {
  const verifier = read("../scripts/verify-factory-workflow.ts");

  assert.match(verifier, /!report\.chatExecutable/);
  assert.doesNotMatch(verifier, /report\.executable/);
});
