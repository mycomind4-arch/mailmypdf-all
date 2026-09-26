import assert from "node:assert/strict";
import test from "node:test";

import {
  createConnectorOperation,
  transitionConnectorOperation,
} from "../src/connector-operation.js";

test("connector operations are resumable and preserve idempotency identity", () => {
  const queued = createConnectorOperation({
    id: "op-1",
    kind: "analyze_matter",
    ownerId: "user-1",
    matterId: "matter-1",
    idempotencyKey: "analysis-1",
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
