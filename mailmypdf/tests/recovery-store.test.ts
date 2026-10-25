import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";
import {
  createRecoveryCaseStore,
  createRecoveryActionStore,
  createRecoveryActionAuthorization,
} from "../src/lib/mcp/recovery-store.server";
import { RecoveryCaseError, type StoredRecoveryCase } from "../src/lib/mcp/recovery-case-service";
import { createCaseGoal, type ActionRecord } from "@mailmypdf/agent-runtime";
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  id = "20000000-0000-4000-8000-000000000001",
  connection = "30000000-0000-4000-8000-000000000001";
const now = "2026-10-04T08:00:00.000Z",
  sha = "a".repeat(64);
const stored = (): StoredRecoveryCase => ({
  goal: createCaseGoal({
    id,
    ownerId: owner,
    objective: "Review",
    desiredOutcome: "Refund",
    category: "billing-recovery",
    now,
  }),
  source: {
    candidate: {
      id: "duplicate:one",
      type: "possible-duplicate-charge",
      merchant: "Merchant",
      accountId: "alias",
      amountMinor: 8900,
      currency: "USD",
      confidence: "needs-review",
      transactionIds: ["one", "two"],
      duplicateTransactionIds: ["two"],
      reason: "Review",
      nextStep: "Review",
    },
    transactions: [],
    evidenceTrust: "user-supplied-unverified",
  },
  creationKey: "create-one",
  requestSha256: sha,
});
const row = () => ({
  id,
  owner_id: owner,
  creation_key: "create-one",
  request_sha256: sha,
  goal: stored().goal,
  source: stored().source,
  revision: 1,
  state: "intake",
});
const record = (): ActionRecord => ({
  review: {
    tool: "email.send",
    version: 1,
    ownerId: owner,
    actorId: owner,
    caseId: id,
    connectionId: connection,
    runId: "run-1",
    idempotencyKey: "email-1",
    requestSha256: sha,
    requiresApproval: true,
    effect: "email",
  },
  approvalId: "40000000-0000-4000-8000-000000000001",
  state: "running",
  revision: 1,
  startedAt: now,
  updatedAt: now,
});
function fixture(responses: Array<{ data: unknown; status?: number }>) {
  const calls: Array<{ url: URL; method: string; body: unknown }> = [];
  const client = createClient<Database>("https://database.example.test", "test-public-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const response = responses.shift();
        assert.ok(response, "Unexpected database request");
        calls.push({
          url: new URL(String(input)),
          method: init?.method ?? "GET",
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return new Response(JSON.stringify(response.data), {
          status: response.status ?? 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  });
  return {
    client,
    calls,
    responses,
    context: { user: { id: owner }, supabase: client } as AuthenticatedUserContext,
  };
}
test("owned case reads and writes use explicit owner filters and optimistic revision", async () => {
  const f = fixture([
    { data: row() },
    { data: [row()] },
    { data: row() },
    {
      data: [
        {
          ...row(),
          goal: { ...stored().goal, revision: 2, state: "active" },
          revision: 2,
          state: "active",
        },
      ],
    },
    { data: [{ id: "50000000-0000-4000-8000-000000000001" }] },
    { data: [{ id }] },
  ]);
  const store = createRecoveryCaseStore(f.context, f.client);
  assert.equal((await store.loadOwned(owner, id))?.goal.id, id);
  assert.equal((await store.listOwned(owner, 25)).length, 1);
  assert.equal((await store.create(stored())).replayed, false);
  await store.save({ ...stored().goal, revision: 2, state: "active" }, 1);
  await store.assertOwnedReferences(owner, id, ["50000000-0000-4000-8000-000000000001"], [id]);
  for (const call of f.calls.filter((c) => c.method === "GET" || c.method === "PATCH"))
    assert.equal(call.url.searchParams.get("owner_id"), `eq.${owner}`);
  assert.equal(f.calls[3].url.searchParams.get("revision"), "eq.1");
  assert.equal(f.calls[2].method, "POST");
});
test("create retries reread the owned winner and conflicting payloads return 409", async () => {
  for (const conflict of [false, true]) {
    const f = fixture([
      { status: 409, data: { code: "23505", message: "private db details" } },
      { data: { ...row(), request_sha256: conflict ? "b".repeat(64) : sha } },
    ]);
    const store = createRecoveryCaseStore(f.context, f.client);
    if (conflict)
      await assert.rejects(
        store.create(stored()),
        (e) => e instanceof RecoveryCaseError && e.status === 409,
      );
    else assert.equal((await store.create(stored())).replayed, true);
    assert.equal(f.calls[1].url.searchParams.get("owner_id"), `eq.${owner}`);
    assert.equal(f.calls[1].url.searchParams.get("creation_key"), "eq.create-one");
  }
});
test("owner mismatch fails before database calls and unavailable references cannot be linked", async () => {
  const f = fixture([{ data: [] }]),
    store = createRecoveryCaseStore(f.context, f.client);
  await assert.rejects(store.loadOwned(other, id), /owner/i);
  await assert.rejects(store.listOwned(other, 25), /owner/i);
  await assert.rejects(
    store.create({ ...stored(), goal: { ...stored().goal, ownerId: other } }),
    /owner/i,
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(
    store.assertOwnedReferences(owner, id, ["50000000-0000-4000-8000-000000000001"], []),
    (e) => e instanceof RecoveryCaseError && e.status === 404,
  );
});
test("missing rows, stale revisions, malformed stored identities and provider errors fail safely", async () => {
  const f = fixture([
      { data: null },
      { data: [] },
      { data: { ...row(), goal: { ...stored().goal, ownerId: other } } },
      { status: 500, data: { message: "token=private-secret" } },
    ]),
    store = createRecoveryCaseStore(f.context, f.client);
  assert.equal(await store.loadOwned(owner, id), undefined);
  await assert.rejects(
    store.save({ ...stored().goal, revision: 2 }, 1),
    (e) => e instanceof RecoveryCaseError && e.status === 409,
  );
  await assert.rejects(store.loadOwned(owner, id), /stored|storage/i);
  await assert.rejects(
    store.listOwned(owner, 25),
    (e) => e instanceof RecoveryCaseError && !e.message.includes("private-secret"),
  );
});
test("durable action claims reread duplicate winners and terminal updates compare running revision", async () => {
  const r = record(),
    dbrow = { owner_id: owner, idempotency_key: "email-1", record: r };
  const f = fixture([
      { data: dbrow },
      { status: 409, data: { code: "23505" } },
      { data: dbrow },
      { data: [{ owner_id: owner }] },
      { data: dbrow },
    ]),
    store = createRecoveryActionStore(f.context, f.client);
  assert.equal((await store.claim(r)).created, true);
  assert.equal((await store.claim(r)).created, false);
  await store.finish(
    { ...r, state: "succeeded", revision: 2, output: { id: "provider-receipt" } },
    1,
  );
  assert.equal(f.calls[3].url.searchParams.get("revision"), "eq.1");
  assert.equal(f.calls[3].url.searchParams.get("state"), "eq.running");
  assert.equal((await store.loadOwned(owner, "email-1"))?.state, "running");
  await assert.rejects(store.loadOwned(other, "email-1"), /owner/i);
});
test("failed durable claims never proceed to provider effects and failed receipts remain conflicts", async () => {
  const f = fixture([
      { status: 500, data: { message: "private-secret" } },
      { data: [] },
      { data: null },
    ]),
    store = createRecoveryActionStore(f.context, f.client);
  await assert.rejects(
    store.claim(record()),
    (e) => e instanceof Error && !e.message.includes("private-secret"),
  );
  await assert.rejects(
    store.finish(
      { ...record(), state: "needs_review", revision: 2, errorCode: "ACTION_OUTCOME_UNCERTAIN" },
      1,
    ),
    /conflict/i,
  );
  assert.equal(await store.loadOwned(owner, "email-1"), undefined);
});
test("action authorization requires an owned open case and active owner-bound Gmail connection", async () => {
  const connectionRow = {
    id: connection,
    owner_id: owner,
    provider: "gmail",
    status: "active",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
  };
  const f = fixture([
    { data: row() },
    { data: connectionRow },
    { data: null },
    { data: { ...row(), state: "cancelled", goal: { ...stored().goal, state: "cancelled" } } },
  ]);
  const auth = createRecoveryActionAuthorization(f.context);
  assert.deepEqual(
    (await auth.authorize({ ...record().review, input: {} })).scopes,
    connectionRow.scopes,
  );
  await assert.rejects(
    auth.authorize({ ...record().review, actorId: other, input: {} }),
    /owner|authorization/i,
  );
  await assert.rejects(auth.authorize({ ...record().review, input: {} }), /authorization/i);
  await assert.rejects(auth.authorize({ ...record().review, input: {} }), /authorization/i);
});
test("approval loading never trusts a caller record and rejects proposals or another owner", async () => {
  const approval = {
    id: record().approvalId,
    owner_id: owner,
    approved_by: owner,
    request_sha256: sha,
    status: "approved",
    approved_at: now,
    expires_at: "2026-10-05T08:00:00Z",
  };
  const f = fixture([
      { data: approval },
      { data: { ...approval, status: "proposed" } },
      { data: null },
    ]),
    auth = createRecoveryActionAuthorization(f.context);
  assert.equal((await auth.loadApproval(owner, approval.id!))?.requestSha256, sha);
  assert.equal(await auth.loadApproval(owner, approval.id!), undefined);
  assert.equal(await auth.loadApproval(owner, approval.id!), undefined);
  await assert.rejects(auth.loadApproval(other, approval.id!), /owner/i);
});
test("revoked connections, malformed approvals and unreadable receipts fail closed", async () => {
  for (const patch of [
    { status: "revoked" },
    { provider: "other" },
    { owner_id: other },
    { scopes: ["https://www.googleapis.com/auth/gmail.readonly", 42] },
  ]) {
    const f = fixture([
      { data: row() },
      {
        data: {
          id: connection,
          owner_id: owner,
          provider: "gmail",
          status: "active",
          scopes: [],
          ...patch,
        },
      },
    ]);
    await assert.rejects(
      createRecoveryActionAuthorization(f.context).authorize({ ...record().review, input: {} }),
      (e) => e instanceof RecoveryCaseError && e.status === 403,
    );
  }
  const malformed = fixture([
    { data: { id: record().approvalId, owner_id: other, status: "approved" } },
  ]);
  await assert.rejects(
    createRecoveryActionAuthorization(malformed.context).loadApproval(owner, record().approvalId!),
    /storage/i,
  );
  const corrupt = fixture([
    {
      data: {
        owner_id: owner,
        idempotency_key: "email-1",
        record: { ...record(), review: { ...record().review, actorId: other } },
      },
    },
  ]);
  await assert.rejects(
    createRecoveryActionStore(corrupt.context, corrupt.client).loadOwned(owner, "email-1"),
    /storage/i,
  );
  const denied = fixture([]);
  assert.throws(
    () =>
      createRecoveryCaseStore(
        { ...denied.context, user: { id: "invalid" } } as AuthenticatedUserContext,
        denied.client,
      ),
    /owner/i,
  );
  await assert.rejects(
    createRecoveryCaseStore(denied.context, denied.client).listOwned(owner, 1000),
    /Invalid/,
  );
});
test("storage errors from writes, winner reads, reference lookup and approval checks are sanitized", async () => {
  const failure = { status: 500, data: { code: "provider_error", message: "private-secret" } };
  const checks: Array<(f: ReturnType<typeof fixture>) => Promise<unknown>> = [
    (f) => createRecoveryCaseStore(f.context, f.client).create(stored()),
    (f) => createRecoveryCaseStore(f.context, f.client).loadOwned(owner, id),
    (f) => createRecoveryCaseStore(f.context, f.client).assertOwnedReferences(owner, id, [id], []),
    (f) => createRecoveryCaseStore(f.context, f.client).save({ ...stored().goal, revision: 2 }, 1),
    (f) => createRecoveryActionStore(f.context, f.client).loadOwned(owner, "email-1"),
    (f) =>
      createRecoveryActionStore(f.context, f.client).finish(
        { ...record(), state: "needs_review", revision: 2, errorCode: "uncertain" },
        1,
      ),
    (f) =>
      createRecoveryActionAuthorization(f.context).authorize({ ...record().review, input: {} }),
    (f) => createRecoveryActionAuthorization(f.context).loadApproval(owner, record().approvalId!),
  ];
  for (const check of checks) {
    const f = fixture([failure]);
    await assert.rejects(
      check(f),
      (e) => e instanceof RecoveryCaseError && !e.message.includes("private-secret"),
    );
  }
  const lost = fixture([{ status: 409, data: { code: "23505" } }, { data: null }]);
  await assert.rejects(
    createRecoveryCaseStore(lost.context, lost.client).create(stored()),
    /storage/i,
  );
  const lostAction = fixture([{ status: 409, data: { code: "23505" } }, { data: null }]);
  await assert.rejects(
    createRecoveryActionStore(lostAction.context, lostAction.client).claim(record()),
    /storage/i,
  );
});
