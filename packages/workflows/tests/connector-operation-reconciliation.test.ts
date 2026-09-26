import assert from "node:assert/strict";
import test from "node:test";

import {
  reconcileStaleConnectorOperations,
  requireReviewForStaleConnectorOperation,
  STALE_CONNECTOR_OPERATION_ACTION,
  type ConnectorOperationReconciliationRepository,
} from "../src/connector-operation-reconciliation.js";
import {
  createConnectorOperation,
  transitionConnectorOperation,
  type ConnectorOperation,
} from "../src/connector-operation.js";

function running(id: string, updatedAt = "2026-09-26T12:00:00.000Z") {
  const queued = createConnectorOperation({
    id,
    kind: "prepare_checkout",
    ownerId: "owner-1",
    matterId: "matter-1",
    idempotencyKey: `checkout-${id}`,
    requestSha256: "a".repeat(64),
    now: updatedAt,
  });
  return transitionConnectorOperation(queued, "running", { now: updatedAt });
}

class MemoryReconciliationRepository implements ConnectorOperationReconciliationRepository {
  constructor(
    readonly operations: ConnectorOperation[],
    readonly conflictIds = new Set<string>(),
  ) {}

  async listStaleRunning(input: { updatedBefore: string; limit: number }) {
    return this.operations
      .filter((operation) =>
        operation.state === "running" && operation.updatedAt <= input.updatedBefore)
      .slice(0, input.limit);
  }

  async saveIfRevision(operation: ConnectorOperation, expectedRevision: number) {
    if (this.conflictIds.has(operation.id)) return null;
    const index = this.operations.findIndex((candidate) => candidate.id === operation.id);
    if (index < 0 || this.operations[index]?.revision !== expectedRevision) return null;
    this.operations[index] = operation;
    return operation;
  }
}

test("stale operations move to review without repeating the original effect", async () => {
  const repository = new MemoryReconciliationRepository([running("op-1")]);
  let resolutions = 0;
  const summary = await reconcileStaleConnectorOperations({
    repository,
    updatedBefore: "2026-09-26T12:15:00.000Z",
    now: "2026-09-26T12:20:00.000Z",
    limit: 10,
    async resolve(operation) {
      resolutions += 1;
      assert.equal(operation.kind, "prepare_checkout");
      return requireReviewForStaleConnectorOperation();
    },
  });

  assert.equal(resolutions, 1);
  assert.deepEqual(summary, {
    scanned: 1,
    succeeded: 0,
    failed: 0,
    waitingForReview: 1,
    conflicts: 0,
    errors: 0,
  });
  assert.equal(repository.operations[0]?.state, "waiting_for_user");
  assert.equal(repository.operations[0]?.requiredAction, STALE_CONNECTOR_OPERATION_ACTION);
});

test("receipt-backed resolvers can confirm success or failure", async () => {
  const repository = new MemoryReconciliationRepository([
    running("success"),
    running("failure"),
  ]);
  const summary = await reconcileStaleConnectorOperations({
    repository,
    updatedBefore: "2026-09-26T12:15:00.000Z",
    now: "2026-09-26T12:20:00.000Z",
    limit: 10,
    async resolve(operation) {
      return operation.id === "success"
        ? { outcome: "confirmed_succeeded", result: { orderId: "order-1" } }
        : {
            outcome: "confirmed_failed",
            error: { code: "NO_EFFECT", message: "No effect was created.", retryable: true },
          };
    },
  });

  assert.equal(summary.succeeded, 1);
  assert.equal(summary.failed, 1);
  assert.deepEqual(repository.operations[0]?.result, { orderId: "order-1" });
  assert.equal(repository.operations[1]?.error?.code, "NO_EFFECT");
});

test("optimistic conflicts and resolver failures never repeat an effect", async () => {
  const repository = new MemoryReconciliationRepository(
    [running("conflict"), running("resolver-error")],
    new Set(["conflict"]),
  );
  const summary = await reconcileStaleConnectorOperations({
    repository,
    updatedBefore: "2026-09-26T12:15:00.000Z",
    now: "2026-09-26T12:20:00.000Z",
    limit: 10,
    async resolve(operation) {
      if (operation.id === "resolver-error") throw new Error("provider receipt unavailable");
      return { outcome: "requires_review", requiredAction: "Review the matter." };
    },
  });

  assert.equal(summary.conflicts, 1);
  assert.equal(summary.errors, 1);
  assert.ok(repository.operations.every((operation) => operation.state === "running"));
});

test("reconciliation bounds batches and rejects inverted time windows", async () => {
  const repository = new MemoryReconciliationRepository([]);
  await assert.rejects(
    () => reconcileStaleConnectorOperations({
      repository,
      updatedBefore: "2026-09-26T12:15:00.000Z",
      now: "2026-09-26T12:00:00.000Z",
      limit: 10,
      resolve: requireReviewForStaleConnectorOperation,
    }),
    /cannot precede/i,
  );
  await assert.rejects(
    () => reconcileStaleConnectorOperations({
      repository,
      updatedBefore: "2026-09-26T12:00:00.000Z",
      now: "2026-09-26T12:15:00.000Z",
      limit: 101,
      resolve: requireReviewForStaleConnectorOperation,
    }),
    /between 1 and 100/i,
  );
});

test("reconciliation distrusts repositories that return a mismatched transition", async () => {
  const operation = running("mismatch");
  const repository: ConnectorOperationReconciliationRepository = {
    async listStaleRunning() {
      return [operation];
    },
    async saveIfRevision(saved) {
      return { ...saved, matterId: "another-matter" };
    },
  };
  const summary = await reconcileStaleConnectorOperations({
    repository,
    updatedBefore: "2026-09-26T12:15:00.000Z",
    now: "2026-09-26T12:20:00.000Z",
    limit: 10,
    resolve: requireReviewForStaleConnectorOperation,
  });

  assert.equal(summary.errors, 1);
  assert.equal(summary.waitingForReview, 0);
});
