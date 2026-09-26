import assert from "node:assert/strict";
import test from "node:test";

import {
  ConnectorOperationIdempotencyConflict,
  beginConnectorOperation,
  createConnectorOperation,
  loadOwnedConnectorOperation,
  transitionStoredConnectorOperation,
  transitionConnectorOperation,
  type ConnectorOperation,
  type ConnectorOperationRepository,
} from "../src/connector-operation.js";

const REQUEST_SHA256 = "a".repeat(64);

class MemoryConnectorOperationRepository implements ConnectorOperationRepository {
  readonly rows = new Map<string, ConnectorOperation>();

  async create(operation: ConnectorOperation) {
    const existing = [...this.rows.values()].find(
      (candidate) =>
        candidate.ownerId === operation.ownerId &&
        candidate.kind === operation.kind &&
        candidate.idempotencyKey === operation.idempotencyKey,
    );
    if (existing) return { operation: existing, created: false };
    this.rows.set(operation.id, operation);
    return { operation, created: true };
  }

  async loadOwned(ownerId: string, operationId: string) {
    const operation = this.rows.get(operationId);
    return operation?.ownerId === ownerId ? operation : null;
  }

  async save(operation: ConnectorOperation, expectedRevision: number) {
    const current = this.rows.get(operation.id);
    if (!current || current.revision !== expectedRevision) {
      throw new Error("Connector operation revision conflict.");
    }
    this.rows.set(operation.id, operation);
    return operation;
  }
}

test("connector operations are resumable and preserve idempotency identity", () => {
  const queued = createConnectorOperation({
    id: "op-1",
    kind: "analyze_matter",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "analysis-1",
    requestSha256: REQUEST_SHA256,
    now: "2026-09-26T12:00:00.000Z",
  });
  assert.equal(queued.state, "queued");
  assert.equal(queued.revision, 1);

  const running = transitionConnectorOperation(queued, "running", {
    now: "2026-09-26T12:00:01.000Z",
  });
  const waiting = transitionConnectorOperation(running, "waiting_for_user", {
    now: "2026-09-26T12:00:02.000Z",
    requiredAction: "Upload the missing notice page.",
  });
  const resumed = transitionConnectorOperation(waiting, "running", {
    now: "2026-09-26T12:01:00.000Z",
  });
  const succeeded = transitionConnectorOperation(resumed, "succeeded", {
    now: "2026-09-26T12:01:01.000Z",
    result: { analysisId: "analysis-1" },
  });

  assert.equal(succeeded.idempotencyKey, "analysis-1");
  assert.equal(succeeded.revision, 5);
  assert.deepEqual(succeeded.result, { analysisId: "analysis-1" });
});

test("connector operations reject invalid transitions and incomplete terminal states", () => {
  const queued = createConnectorOperation({
    id: "op-2",
    kind: "generate_draft",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "draft-1",
    requestSha256: REQUEST_SHA256,
    now: "2026-09-26T12:00:00.000Z",
  });

  assert.throws(
    () => transitionConnectorOperation(queued, "succeeded", {
      now: "2026-09-26T12:00:01.000Z",
    }),
    /result/i,
  );
  assert.throws(
    () => transitionConnectorOperation(queued, "waiting_for_user", {
      now: "2026-09-26T12:00:01.000Z",
    }),
    /required action/i,
  );

  const failed = transitionConnectorOperation(queued, "failed", {
    now: "2026-09-26T12:00:01.000Z",
    error: { code: "PROVIDER_UNAVAILABLE", message: "Try again later.", retryable: true },
  });
  assert.throws(
    () => transitionConnectorOperation(failed, "running", {
      now: "2026-09-26T12:00:02.000Z",
    }),
    /terminal/i,
  );
});

test("connector operations require stable owner, matter, and idempotency identifiers", () => {
  assert.throws(
    () => createConnectorOperation({
      id: "op-3",
      kind: "analyze_matter",
      ownerId: "user-1",
      matterId: "matter-1",
      idempotencyKey: "",
      requestSha256: REQUEST_SHA256,
      now: "2026-09-26T12:00:00.000Z",
    }),
    /idempotency/i,
  );
  assert.throws(
    () => createConnectorOperation({
      id: "op-4",
      kind: "analyze_matter",
      ownerId: "user-1",
      matterId: "matter-1",
      idempotencyKey: "analysis-4",
      requestSha256: REQUEST_SHA256,
      now: "not-a-date",
    }),
    /date-time/i,
  );
});

test("connector operations reject backward timestamps and unsupported transitions", () => {
  const queued = createConnectorOperation({
    id: "op-5",
    kind: "preview_packet",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "preview-5",
    requestSha256: REQUEST_SHA256,
    now: "2026-09-26T12:00:00.000Z",
  });
  assert.throws(
    () => transitionConnectorOperation(queued, "succeeded", {
      now: "2026-09-26T12:00:01.000Z",
      result: { packetId: "packet-1" },
    }),
    /cannot transition/i,
  );
  const running = transitionConnectorOperation(queued, "running", {
    now: "2026-09-26T12:00:02.000Z",
  });
  assert.throws(
    () => transitionConnectorOperation(running, "failed", {
      now: "2026-09-26T12:00:03.000Z",
    }),
    /requires an error/i,
  );
  assert.throws(
    () => transitionConnectorOperation(running, "cancelled", {
      now: "2026-09-26T11:59:59.000Z",
    }),
    /backward/i,
  );
});

test("operation repositories replay one owner/matter-bound idempotent operation", async () => {
  const repository = new MemoryConnectorOperationRepository();
  const input = {
    id: "op-persisted-1",
    kind: "analyze_matter" as const,
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "analysis-persisted-1",
    requestSha256: REQUEST_SHA256,
    now: "2026-09-26T12:00:00.000Z",
  };

  const first = await beginConnectorOperation(repository, input);
  const replay = await beginConnectorOperation(repository, {
    ...input,
    id: "op-persisted-2",
    now: "2026-09-26T12:00:01.000Z",
  });

  assert.equal(first.created, true);
  assert.equal(replay.created, false);
  assert.equal(replay.operation.id, first.operation.id);

  const running = await transitionStoredConnectorOperation(
    repository,
    first.operation,
    "running",
    { now: "2026-09-26T12:00:02.000Z" },
  );
  const succeeded = await transitionStoredConnectorOperation(
    repository,
    running,
    "succeeded",
    {
      now: "2026-09-26T12:00:03.000Z",
      result: { analysisId: "analysis-1" },
    },
  );
  const loaded = await loadOwnedConnectorOperation(repository, "user-1", succeeded.id);

  assert.equal(loaded?.state, "succeeded");
  assert.deepEqual(loaded?.result, { analysisId: "analysis-1" });
  assert.equal(await loadOwnedConnectorOperation(repository, "user-2", succeeded.id), null);
});

test("idempotency keys cannot be rebound to another matter", async () => {
  const repository = new MemoryConnectorOperationRepository();
  await beginConnectorOperation(repository, {
    id: "op-bound-1",
    kind: "preview_packet",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "packet-preview-1",
    requestSha256: REQUEST_SHA256,
    now: "2026-09-26T12:00:00.000Z",
  });

  await assert.rejects(
    () => beginConnectorOperation(repository, {
      id: "op-bound-2",
      kind: "preview_packet",
      ownerId: "user-1",
      matterId: "matter-2",
      idempotencyKey: "packet-preview-1",
      requestSha256: REQUEST_SHA256,
      now: "2026-09-26T12:00:01.000Z",
    }),
    ConnectorOperationIdempotencyConflict,
  );
});

test("idempotency keys cannot replay different arguments", async () => {
  const repository = new MemoryConnectorOperationRepository();
  await beginConnectorOperation(repository, {
    id: "op-request-1",
    kind: "save_draft",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "save-draft-1",
    requestSha256: "a".repeat(64),
    now: "2026-09-26T12:00:00.000Z",
  });

  await assert.rejects(
    () => beginConnectorOperation(repository, {
      id: "op-request-2",
      kind: "save_draft",
      ownerId: "user-1",
      matterId: "matter-1",
      idempotencyKey: "save-draft-1",
      requestSha256: "b".repeat(64),
      now: "2026-09-26T12:00:01.000Z",
    }),
    ConnectorOperationIdempotencyConflict,
  );
});
