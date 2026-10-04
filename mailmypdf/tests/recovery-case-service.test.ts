import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecoveryCaseFromScan,
  getRecoveryCase,
  listRecoveryCases,
  updateRecoveryCase,
  RecoveryCaseError,
  type RecoveryCasePersistence,
  type StoredRecoveryCase,
} from "../src/lib/mcp/recovery-case-service";
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  id = "20000000-0000-4000-8000-000000000001";
const now = "2026-10-04T08:00:00.000Z";
const tx = (id: string) => ({
  id,
  accountId: "Checking alias",
  merchant: "Northstar",
  amountMinor: 8900,
  currency: "USD",
  postedAt: now,
  kind: "debit",
  state: "settled",
});
const args = () => ({
  transactions: [tx("one"), tx("two")],
  candidate_id: "duplicate:one",
  desired_outcome: "Refund the confirmed extra charge",
  user_confirmed_save: true,
  idempotency_key: "create-one",
});
function fixture() {
  const rows = new Map<string, StoredRecoveryCase>();
  const keys = new Map<string, StoredRecoveryCase>();
  const references = new Set<string>();
  const store: RecoveryCasePersistence = {
    async create(input) {
      const key = `${input.goal.ownerId}:${input.creationKey}`,
        previous = keys.get(key);
      if (previous) {
        if (previous.requestSha256 !== input.requestSha256)
          throw new RecoveryCaseError(
            409,
            "Recovery case retry key conflicts with a different request.",
          );
        return { stored: structuredClone(previous), replayed: true };
      }
      const stored = structuredClone(input);
      rows.set(stored.goal.id, stored);
      keys.set(key, stored);
      return { stored, replayed: false };
    },
    async loadOwned(ownerId, caseId) {
      const value = rows.get(caseId);
      return value?.goal.ownerId === ownerId ? structuredClone(value) : undefined;
    },
    async listOwned(ownerId, limit) {
      return [...rows.values()]
        .filter((r) => r.goal.ownerId === ownerId)
        .slice(0, limit)
        .map((r) => structuredClone(r));
    },
    async assertOwnedReferences(ownerId, _caseId, evidenceIds, matterIds) {
      if ([...evidenceIds, ...matterIds].some((value) => !references.has(`${ownerId}:${value}`)))
        throw new RecoveryCaseError(404, "Owned evidence or matter not found.");
    },
    async save(goal, revision) {
      const row = rows.get(goal.id);
      if (!row || row.goal.ownerId !== goal.ownerId || row.goal.revision !== revision)
        throw new RecoveryCaseError(409, "Recovery case revision changed.");
      row.goal = structuredClone(goal);
      return structuredClone(row);
    },
  };
  return { store, rows, references, clock: { now: () => now, newId: () => id } };
}
test("explicitly saving a scanned candidate creates a private intake case with unverified source provenance", async () => {
  const f = fixture(),
    result = await createRecoveryCaseFromScan(args(), owner, f.store, f.clock);
  assert.equal(result.case.ownerId, owner);
  assert.equal(result.case.state, "intake");
  assert.equal(result.case.soughtValue?.amountMinor, 8900);
  assert.equal(result.case.revision, 1);
  assert.deepEqual(result.case.evidenceIds, []);
  assert.equal(result.source.evidenceTrust, "user-supplied-unverified");
  assert.equal(result.externalActionsAuthorized, false);
  assert.equal(result.replayed, false);
});
test("missing confirmation, invented candidates, extra owner fields, invalid batches and keys fail before storage", async () => {
  for (const patch of [
    { user_confirmed_save: false },
    { candidate_id: "invented" },
    { owner_id: other },
    { transactions: [tx("one")] },
    { idempotency_key: "x" },
    { desired_outcome: "" },
  ]) {
    const f = fixture();
    await assert.rejects(
      createRecoveryCaseFromScan({ ...args(), ...patch }, owner, f.store, f.clock),
      (e) => e instanceof RecoveryCaseError && e.status === 400,
    );
    assert.equal(f.rows.size, 0);
  }
});
test("an identical retry returns the same saved case; changed details conflict", async () => {
  const f = fixture();
  await createRecoveryCaseFromScan(args(), owner, f.store, f.clock);
  const replay = await createRecoveryCaseFromScan(args(), owner, f.store, {
    ...f.clock,
    newId: () => crypto.randomUUID(),
  });
  assert.equal(replay.case.id, id);
  assert.equal(replay.replayed, true);
  assert.equal(f.rows.size, 1);
  await assert.rejects(
    createRecoveryCaseFromScan(
      { ...args(), desired_outcome: "Different outcome" },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 409,
  );
});
test("get and list cannot return another owner data and bounds fail closed", async () => {
  const f = fixture();
  await createRecoveryCaseFromScan(args(), owner, f.store, f.clock);
  assert.equal((await getRecoveryCase({ case_id: id }, owner, f.store)).case.id, id);
  await assert.rejects(
    getRecoveryCase({ case_id: id }, other, f.store),
    (e) => e instanceof RecoveryCaseError && e.status === 404,
  );
  assert.equal((await listRecoveryCases({ limit: 25 }, other, f.store)).cases.length, 0);
  await assert.rejects(listRecoveryCases({ limit: 500 }, owner, f.store), /Invalid/);
  await assert.rejects(getRecoveryCase({ case_id: "not-a-uuid" }, owner, f.store), /Invalid/);
});
test("updates require exact revision, owned links, and evidence for an explicitly confirmed outcome", async () => {
  const f = fixture();
  await createRecoveryCaseFromScan(args(), owner, f.store, f.clock);
  await updateRecoveryCase(
    { case_id: id, expected_revision: 1, event: { type: "activate" } },
    owner,
    f.store,
    f.clock,
  );
  await assert.rejects(
    updateRecoveryCase(
      { case_id: id, expected_revision: 1, event: { type: "cancel" } },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 409,
  );
  const evidenceId = "50000000-0000-4000-8000-000000000001";
  await assert.rejects(
    updateRecoveryCase(
      { case_id: id, expected_revision: 2, event: { type: "attach-evidence", evidenceId } },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 404,
  );
  f.references.add(`${owner}:${evidenceId}`);
  await updateRecoveryCase(
    { case_id: id, expected_revision: 2, event: { type: "attach-evidence", evidenceId } },
    owner,
    f.store,
    f.clock,
  );
  await assert.rejects(
    updateRecoveryCase(
      {
        case_id: id,
        expected_revision: 3,
        event: { type: "resolve", outcome: "Refund received", evidenceIds: [evidenceId] },
      },
      owner,
      f.store,
      f.clock,
    ),
    /Invalid/,
  );
  const result = await updateRecoveryCase(
    {
      case_id: id,
      expected_revision: 3,
      user_confirmed_resolution: true,
      event: {
        type: "resolve",
        outcome: "Refund received",
        evidenceIds: [evidenceId],
        recoveredValue: { amountMinor: 8900, currency: "USD" },
      },
    },
    owner,
    f.store,
    f.clock,
  );
  assert.equal(result.case.state, "resolved");
  assert.equal(result.case.resolution?.confirmedBy, owner);
  await assert.rejects(
    updateRecoveryCase(
      { case_id: id, expected_revision: 4, event: { type: "resume" } },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 400,
  );
});
test("wait/resume/cancel preserve the outcome and never authorize an external action", async () => {
  const f = fixture();
  await createRecoveryCaseFromScan(args(), owner, f.store, f.clock);
  await updateRecoveryCase(
    { case_id: id, expected_revision: 1, event: { type: "activate" } },
    owner,
    f.store,
    f.clock,
  );
  const waiting = await updateRecoveryCase(
    {
      case_id: id,
      expected_revision: 2,
      event: { type: "wait", reason: "Awaiting merchant reply", dueAt: "2026-10-10T08:00:00Z" },
    },
    owner,
    f.store,
    f.clock,
  );
  assert.equal(waiting.case.waiting?.reason, "Awaiting merchant reply");
  await updateRecoveryCase(
    { case_id: id, expected_revision: 3, event: { type: "resume" } },
    owner,
    f.store,
    f.clock,
  );
  const cancelled = await updateRecoveryCase(
    { case_id: id, expected_revision: 4, event: { type: "cancel" } },
    owner,
    f.store,
    f.clock,
  );
  assert.equal(cancelled.case.state, "cancelled");
  assert.equal(cancelled.externalActionsAuthorized, false);
});
test("stored provenance preserves partial refund links and normalizes accepted source timestamps", async () => {
  const f = fixture();
  const refund = {
    ...tx("refund"),
    kind: "credit",
    amountMinor: 2000,
    reversesTransactionId: "two",
    postedAt: "2026-10-04",
  };
  const result = await createRecoveryCaseFromScan(
    { ...args(), transactions: [tx("one"), tx("two"), refund] },
    owner,
    f.store,
    f.clock,
  );
  assert.equal(result.case.soughtValue?.amountMinor, 6900);
  assert.equal(result.source.transactions.length, 3);
  assert.equal(result.source.transactions[2].reversesTransactionId, "two");
  assert.equal(result.source.transactions[2].postedAt, "2026-10-04T00:00:00.000Z");
  assert.equal(result.case.evidenceIds.length, 0);
});
test("the request snapshots supplied records before asynchronous persistence and rejects unsupported action events", async () => {
  const f = fixture(),
    input = args();
  const pending = createRecoveryCaseFromScan(input, owner, f.store, f.clock);
  input.transactions[0].merchant = "Changed after request";
  const saved = await pending;
  assert.equal(saved.source.transactions[0].merchant, "Northstar");
  await assert.rejects(
    updateRecoveryCase(
      {
        case_id: id,
        expected_revision: 1,
        event: { type: "record-action", actionKey: "forged-send" },
      },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 400,
  );
  await assert.rejects(
    updateRecoveryCase(
      {
        case_id: id,
        expected_revision: 1,
        event: { type: "link-matter", matterId: "50000000-0000-4000-8000-000000000001" },
      },
      owner,
      f.store,
      f.clock,
    ),
    (e) => e instanceof RecoveryCaseError && e.status === 404,
  );
});
