import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.MAILMYPDF_PGLITE_MODULE ?? "@electric-sql/pglite");
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002";
const caseId = "20000000-0000-4000-8000-000000000001",
  connectionId = "30000000-0000-4000-8000-000000000001",
  approvalId = "40000000-0000-4000-8000-000000000001";
const now = "2026-10-04T08:00:00.000Z",
  sha = "a".repeat(64);
let db;
const goal = (patch = {}) => ({
  schema: "mailmypdf.case-goal/v1",
  id: caseId,
  ownerId: owner,
  objective: "Review duplicate charge",
  desiredOutcome: "Refund confirmed excess",
  category: "billing-recovery",
  soughtValue: { amountMinor: 8900, currency: "USD" },
  evidenceIds: [],
  matterIds: [],
  actionKeys: [],
  state: "intake",
  revision: 1,
  createdAt: now,
  updatedAt: now,
  ...patch,
});
const review = () => ({
  tool: "email.send",
  version: 1,
  ownerId: owner,
  actorId: owner,
  caseId,
  runId: "run-1",
  connectionId,
  idempotencyKey: "email-1",
  requestSha256: sha,
  requiresApproval: true,
  effect: "email",
});
const record = (patch = {}) => ({
  review: review(),
  state: "running",
  revision: 1,
  startedAt: now,
  updatedAt: now,
  approvalId,
  ...patch,
});
const insertGoal = async (patch = {}, user = owner, id = caseId) =>
  db.query(
    "insert into public.recovery_case_goals(id,owner_id,creation_key,request_sha256,source,goal) values($1,$2,$3,$4,$5,$6)",
    [
      id,
      user,
      `create-${id}`,
      sha,
      {
        candidateId: "duplicate:one",
        transactionIds: ["one", "two"],
        evidenceTrust: "user-supplied-unverified",
      },
      goal({ id, ownerId: user, ...patch }),
    ],
  );
const insertConnection = async () =>
  db.query(
    "insert into public.recovery_provider_connections(id,owner_id,provider,account_subject,email,scopes) values($1,$2,'gmail','gmail-user-1','owner@example.test',$3)",
    [connectionId, owner, ["https://www.googleapis.com/auth/gmail.send"]],
  );
const insertApproval = async () =>
  db.query(
    "insert into public.recovery_action_approvals(id,owner_id,case_id,connection_id,request_sha256,review,input) values($1,$2,$3,$4,$5,$6,$7)",
    [
      approvalId,
      owner,
      caseId,
      connectionId,
      sha,
      review(),
      { to: ["recipient@example.test"], subject: "Review", body: "Exact approved text" },
    ],
  );
async function approve() {
  await db.query(
    "update public.recovery_action_approvals set status='approved',approved_by=$1,approved_at=now(),expires_at=now()+interval '1 hour' where id=$2",
    [owner, approvalId],
  );
}
const insertRecord = async (value = record()) =>
  db.query(
    "insert into public.recovery_action_executions(owner_id,idempotency_key,case_id,connection_id,approval_id,request_sha256,record) values($1,$2,$3,$4,$5,$6,$7)",
    [owner, "email-1", caseId, connectionId, approvalId, sha, value],
  );
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table public.workflow_cases(id uuid primary key,owner_id uuid not null references auth.users(id),unique(id,owner_id));
    create table public.secure_documents(id uuid primary key,owner_id uuid not null references auth.users(id));
    grant usage on schema auth to service_role; grant select on public.secure_documents,public.workflow_cases to service_role;
    insert into auth.users values ('${owner}'),('${other}');`);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/20261004085640_recovery_goals_and_governed_actions.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
after(async () => db?.close());
beforeEach(async () => {
  await db.exec("reset role");
  if ((await db.query("select to_regclass('public.recovery_case_goals') as name")).rows[0].name)
    await db.exec(
      "truncate public.recovery_case_goals,public.recovery_provider_connections,public.secure_documents,public.workflow_cases cascade;",
    );
});
test("migration enables RLS and denies anonymous reads and direct client writes", async () => {
  await insertGoal();
  assert.deepEqual(
    (
      await db.query(
        "select relname,relrowsecurity from pg_class where relname in ('recovery_case_goals','recovery_provider_connections','recovery_action_approvals','recovery_action_executions') order by relname",
      )
    ).rows.map((r) => r.relrowsecurity),
    [true, true, true, true],
  );
  await db.exec("set role anon");
  await assert.rejects(db.query("select * from public.recovery_case_goals"), /permission denied/);
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  assert.equal((await db.query("select * from public.recovery_case_goals")).rows.length, 1);
  await assert.rejects(
    db.query("update public.recovery_case_goals set creation_key='tamper'"),
    /permission denied/,
  );
  await assert.rejects(
    insertGoal({}, other, "20000000-0000-4000-8000-000000000002"),
    /permission denied/,
  );
});
test("RLS hides other owners and provider credential references have no client read path", async () => {
  await insertGoal();
  await insertConnection();
  await db.query(
    "insert into private.recovery_provider_credentials(connection_id,owner_id,credential_ref) values($1,$2,$3)",
    [connectionId, owner, "vault:test-reference"],
  );
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  assert.equal((await db.query("select * from public.recovery_case_goals")).rows.length, 0);
  assert.equal(
    (await db.query("select * from public.recovery_provider_connections")).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select * from private.recovery_provider_credentials"),
    /permission denied/,
  );
});
test("case identity, creation retries, initial state and monotonic revisions are database enforced", async () => {
  await assert.rejects(insertGoal({ state: "resolved", revision: 2 }), /initial|invalid/i);
  await insertGoal();
  await assert.rejects(insertGoal(), /duplicate key/);
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({ ownerId: other, revision: 2 }),
      caseId,
    ]),
    /identity|owner/i,
  );
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({ state: "active", revision: 3 }),
      caseId,
    ]),
    /revision/i,
  );
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({ state: "active", revision: 2 }),
    caseId,
  ]);
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({ state: "intake", revision: 3 }),
      caseId,
    ]),
    /transition/i,
  );
});
test("evidence and matter links cannot cross owners, and resolution needs owned linked evidence", async () => {
  const evidence = "50000000-0000-4000-8000-000000000001",
    foreign = "50000000-0000-4000-8000-000000000002";
  await insertGoal();
  await db.query("insert into public.secure_documents values($1,$2),($3,$4)", [
    evidence,
    owner,
    foreign,
    other,
  ]);
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({ evidenceIds: [foreign], revision: 2 }),
      caseId,
    ]),
    /evidence|ownership/i,
  );
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({ state: "active", revision: 2 }),
    caseId,
  ]);
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({
        state: "resolved",
        revision: 3,
        resolution: { outcome: "Refund", evidenceIds: [evidence], confirmedBy: owner },
      }),
      caseId,
    ]),
    /evidence/i,
  );
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({ state: "active", revision: 3, evidenceIds: [evidence] }),
    caseId,
  ]);
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({
      state: "resolved",
      revision: 4,
      evidenceIds: [evidence],
      resolution: {
        outcome: "Refund confirmed",
        evidenceIds: [evidence],
        recoveredValue: { amountMinor: 8900, currency: "USD" },
        confirmedBy: owner,
      },
    }),
    caseId,
  ]);
  await assert.rejects(
    db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
      goal({ state: "active", revision: 5, evidenceIds: [evidence] }),
      caseId,
    ]),
    /terminal/i,
  );
});
test("provider account identity is immutable and approvals cannot be forged at insertion", async () => {
  await insertGoal();
  await insertConnection();
  await assert.rejects(
    db.query(
      "update public.recovery_provider_connections set account_subject='someone-else',revision=2 where id=$1",
      [connectionId],
    ),
    /immutable/i,
  );
  await insertApproval();
  await assert.rejects(
    db.query("update public.recovery_action_approvals set input=$1 where id=$2", [
      { body: "changed" },
      approvalId,
    ]),
    /immutable/i,
  );
  await assert.rejects(insertRecord(), /approval/i);
  await approve();
  await assert.rejects(
    db.query("update public.recovery_action_approvals set approved_by=$1 where id=$2", [
      other,
      approvalId,
    ]),
    /approval|immutable/i,
  );
});
test("execution claims require a live exact approval and serialize duplicate identity", async () => {
  await insertGoal();
  await insertConnection();
  await insertApproval();
  await approve();
  await insertRecord();
  await assert.rejects(insertRecord(), /duplicate key/);
  await assert.rejects(
    db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
      record({
        review: { ...review(), requestSha256: "b".repeat(64) },
        state: "succeeded",
        revision: 2,
        output: { id: "receipt" },
      }),
      owner,
    ]),
    /identity|fingerprint/i,
  );
  await db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
    record({ state: "succeeded", revision: 2, output: { id: "receipt" } }),
    owner,
  ]);
  await assert.rejects(
    db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
      record({ state: "running", revision: 3 }),
      owner,
    ]),
    /terminal|transition/i,
  );
});
test("revoked approvals and connections deny new claims without exposing secrets", async () => {
  await insertGoal();
  await insertConnection();
  await insertApproval();
  await approve();
  await db.query("update public.recovery_action_approvals set status='revoked' where id=$1", [
    approvalId,
  ]);
  await assert.rejects(insertRecord(), /approval/i);
  await assert.rejects(
    db.query("update public.recovery_action_approvals set status='approved' where id=$1", [
      approvalId,
    ]),
    /revoked|transition/i,
  );
  await db.query(
    "update public.recovery_provider_connections set status='revoked',revision=2 where id=$1",
    [connectionId],
  );
  await assert.rejects(insertRecord(), /connection/i);
});
test("approved status requires complete confirmation evidence, not SQL null comparisons", async () => {
  await insertGoal();
  await insertConnection();
  await insertApproval();
  for (const set of [
    "approved_by=$1",
    "approved_by=$1,approved_at=now()",
    "approved_by=$1,expires_at=now()+interval '1 hour'",
  ]) {
    await assert.rejects(
      db.query(`update public.recovery_action_approvals set status='approved',${set} where id=$2`, [
        owner,
        approvalId,
      ]),
      /confirmation|state/i,
    );
  }
});
test("a scope removed after approval blocks the database claim", async () => {
  await insertGoal();
  await insertConnection();
  await insertApproval();
  await approve();
  await db.query(
    "update public.recovery_provider_connections set scopes=$1,revision=2 where id=$2",
    [["https://www.googleapis.com/auth/gmail.readonly"], connectionId],
  );
  await assert.rejects(insertRecord(), /scope|policy/i);
});
test("an overdue waiting case can still attach evidence and resume", async () => {
  const evidence = "50000000-0000-4000-8000-000000000003";
  await insertGoal();
  await db.query("insert into public.secure_documents values($1,$2)", [evidence, owner]);
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({ state: "active", revision: 2 }),
    caseId,
  ]);
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [
    goal({
      state: "waiting",
      revision: 3,
      waiting: { reason: "Awaiting reply", dueAt: "2026-10-05T08:00:00Z" },
    }),
    caseId,
  ]);
  const overdue = goal({
    state: "waiting",
    revision: 4,
    updatedAt: "2026-10-06T08:00:00Z",
    waiting: { reason: "Awaiting reply", dueAt: "2026-10-05T08:00:00Z" },
    evidenceIds: [evidence],
  });
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [overdue, caseId]);
  const resumed = { ...overdue, state: "active", revision: 5 };
  delete resumed.waiting;
  await db.query("update public.recovery_case_goals set goal=$1 where id=$2", [resumed, caseId]);
});
test("ambiguous external writes cannot become failed and receipts cannot overwrite terminal state", async () => {
  await insertGoal();
  await insertConnection();
  await insertApproval();
  await approve();
  await insertRecord();
  await assert.rejects(
    db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
      record({ state: "failed", revision: 2, errorCode: "error" }),
      owner,
    ]),
    /review/i,
  );
  await db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
    record({ state: "needs_review", revision: 2, errorCode: "ACTION_OUTCOME_UNCERTAIN" }),
    owner,
  ]);
  await assert.rejects(
    db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
      record({ state: "succeeded", revision: 3, output: { id: "receipt" } }),
      owner,
    ]),
    /terminal/i,
  );
});

test("the constrained service role can persist claims and receipts through private trigger guards", async () => {
  await db.exec("set role service_role");
  await insertGoal();
  await insertConnection();
  await insertApproval();
  await approve();
  await insertRecord();
  await db.query("update public.recovery_action_executions set record=$1 where owner_id=$2", [
    record({ state: "succeeded", revision: 2, output: { id: "receipt" } }),
    owner,
  ]);
  assert.equal(
    (await db.query("select state from public.recovery_action_executions")).rows[0].state,
    "succeeded",
  );
});
test('a connection cannot store null scope elements that turn a deny check into SQL unknown',async()=>{
  await assert.rejects(db.query("insert into public.recovery_provider_connections(id,owner_id,provider,account_subject,email,scopes) values($1,$2,'gmail','gmail-user-1','owner@example.test',$3)",[connectionId,owner,[null]]),/scope|check constraint/i);
});
