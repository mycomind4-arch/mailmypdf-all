import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  createConnectorReceiptResolver,
  reconcileInterruptedConnectorOperations,
  requireConnectorReconciliationAuthorization,
} from "../src/lib/mcp/connector-operation-reconciliation.server";
import {
  createConnectorOperation,
  transitionConnectorOperation,
} from "@mailmypdf/workflows/connector-operation";
import {
  bindConnectorCheckoutCorrelation,
  getConnectorCheckoutCorrelation,
} from "../src/lib/mcp/connector-runtime-correlation.server";

const routeSource = readFileSync(
  join(import.meta.dirname, "../src/routes/api/internal/reconcile-connector-operations.ts"),
  "utf8",
);
const serviceSource = readFileSync(
  join(import.meta.dirname, "../src/lib/mcp/connector-operation-reconciliation.server.ts"),
  "utf8",
);
const checkoutSource = readFileSync(
  join(import.meta.dirname, "../src/lib/secure-core/workflow-checkout.server.ts"),
  "utf8",
);
const runtimeHostSource = readFileSync(
  join(import.meta.dirname, "../src/lib/secure-core/workflow-runtime-host.server.ts"),
  "utf8",
);
const workflowToolsSource = readFileSync(
  join(import.meta.dirname, "../src/lib/mcp/workflow-tools.server.ts"),
  "utf8",
);
const runtimeCorrelationSource = readFileSync(
  join(import.meta.dirname, "../src/lib/mcp/connector-runtime-correlation.server.ts"),
  "utf8",
);
const migration = readFileSync(
  join(
    import.meta.dirname,
    "../supabase/migrations/20260926150000_connector_operation_reconciliation.sql",
  ),
  "utf8",
);

test("connector reconciliation uses a dedicated timing-safe job secret", () => {
  const previous = process.env.MAILMYPDF_CONNECTOR_JOB_SECRET;
  process.env.MAILMYPDF_CONNECTOR_JOB_SECRET = "c".repeat(32);
  try {
    assert.doesNotThrow(() => requireConnectorReconciliationAuthorization(
      new Request("https://mailmypdf.test/internal", {
        headers: { authorization: `Bearer ${"c".repeat(32)}` },
      }),
    ));
    assert.throws(
      () => requireConnectorReconciliationAuthorization(
        new Request("https://mailmypdf.test/internal", {
          headers: { authorization: `Bearer ${"x".repeat(32)}` },
        }),
      ),
      (error) => error instanceof Response && error.status === 401,
    );
  } finally {
    if (previous === undefined) delete process.env.MAILMYPDF_CONNECTOR_JOB_SECRET;
    else process.env.MAILMYPDF_CONNECTOR_JOB_SECRET = previous;
  }
});

test("connector reconciliation rejects unsafe batch settings before database access", async () => {
  await assert.rejects(
    () => reconcileInterruptedConnectorOperations({ limit: 101 }),
    /between 1 and 100/i,
  );
  await assert.rejects(
    () => reconcileInterruptedConnectorOperations({ staleAfterMinutes: 4 }),
    /between 5 and 1440/i,
  );
  await assert.rejects(
    () => reconcileInterruptedConnectorOperations({ now: new Date("invalid") }),
    /time is invalid/i,
  );
});

test("the internal route is POST-only, no-store, and never invokes an action tool", () => {
  assert.match(routeSource, /POST:/);
  assert.doesNotMatch(routeSource, /GET:/);
  assert.match(routeSource, /Cache-Control.*no-store/s);
  assert.doesNotMatch(routeSource, /executeMcpTool|executeDurableConnectorOperation|callRuntime/);
  assert.doesNotMatch(serviceSource, /executeMcpTool|executeDurableConnectorOperation|callRuntime/);
  assert.match(serviceSource, /createConnectorReceiptResolver/);
  assert.doesNotMatch(serviceSource, /checkout\.sessions\.create/);
});

test("stale running scans use a partial database index", () => {
  assert.match(migration, /connector_operations_stale_running_idx/i);
  assert.match(migration, /where state = 'running'/i);
  assert.match(migration, /updated_at, id/i);
});

test("checkout receipts are bound to the exact owned running operation", () => {
  assert.match(runtimeCorrelationSource, /new WeakMap<Request/);
  assert.doesNotMatch(workflowToolsSource, /x-mailmypdf-connector/);
  assert.match(workflowToolsSource, /bindConnectorCheckoutCorrelation\(runtime, operation\)/);
  assert.match(runtimeHostSource, /getConnectorCheckoutCorrelation\(request\)/);
  assert.match(runtimeHostSource, /\.eq\("owner_id", context\.user\.id\)/);
  assert.match(runtimeHostSource, /\.eq\("matter_id", input\.matterId\)/);
  assert.match(runtimeHostSource, /\.eq\("kind", "prepare_checkout"\)/);
  assert.match(runtimeHostSource, /\.eq\("state", "running"\)/);
  assert.match(runtimeHostSource, /\.eq\("request_sha256", input\.connectorOperation\.requestSha256\)/);
  assert.match(checkoutSource, /connectorOperationId: input\.connectorOperation\.operationId/);
  assert.match(checkoutSource, /connectorRequestSha256: input\.connectorOperation\.requestSha256/);
  assert.match(serviceSource, /connectorOperationId === operation\.id/);
  assert.match(serviceSource, /connectorRequestSha256 === operation\.requestSha256/);
});

test("checkout correlation cannot be injected through public request headers", () => {
  const internal = new Request("https://mailmypdf.test/runtime");
  const publicRequest = new Request("https://mailmypdf.test/runtime", {
    headers: {
      "x-mailmypdf-connector-operation-id": "11111111-1111-4111-8111-111111111111",
      "x-mailmypdf-connector-request-sha256": "a".repeat(64),
    },
  });
  bindConnectorCheckoutCorrelation(internal, {
    id: "11111111-1111-4111-8111-111111111111",
    requestSha256: "a".repeat(64),
  });
  assert.deepEqual(getConnectorCheckoutCorrelation(internal), {
    operationId: "11111111-1111-4111-8111-111111111111",
    requestSha256: "a".repeat(64),
  });
  assert.equal(getConnectorCheckoutCorrelation(publicRequest), undefined);
});

function staleCheckoutOperation() {
  return transitionConnectorOperation(createConnectorOperation({
    id: "11111111-1111-4111-8111-111111111111",
    kind: "prepare_checkout",
    ownerId: "owner-1",
    matterId: "matter-1",
    idempotencyKey: "checkout-retry-1",
    requestSha256: "a".repeat(64),
    now: "2026-09-27T10:00:00.000Z",
  }), "running", { now: "2026-09-27T10:00:00.000Z" });
}

const checkoutOrder = {
  id: "order-1",
  workflow_case_id: "matter-1",
  case_approval_id: "approval-1",
  approved_packet_sha256: "b".repeat(64),
  approved_price_cents: 1899,
  stripe_session_id: "cs_test_1",
};

test("checkout reconciliation confirms success only from a matching immutable receipt", async () => {
  const resolve = createConnectorReceiptResolver({
    async findCheckoutCandidates() { return [checkoutOrder]; },
    async retrieveCheckoutSession() {
      return {
        id: "cs_test_1",
        status: "open",
        url: "https://checkout.stripe.test/cs_test_1",
        amount_total: 1899,
        metadata: {
          orderId: "order-1",
          workflowCaseId: "matter-1",
          caseApprovalId: "approval-1",
          connectorOperationId: "11111111-1111-4111-8111-111111111111",
          connectorRequestSha256: "a".repeat(64),
        },
      };
    },
  });

  assert.deepEqual(await resolve(staleCheckoutOperation()), {
    outcome: "confirmed_succeeded",
    result: {
      checkoutUrl: "https://checkout.stripe.test/cs_test_1",
      orderId: "order-1",
      packetSha256: "b".repeat(64),
      totalCents: 1899,
    },
  });
});

test("completed checkout recovery returns no stale payment URL", async () => {
  const resolve = createConnectorReceiptResolver({
    async findCheckoutCandidates() { return [checkoutOrder]; },
    async retrieveCheckoutSession() {
      return {
        id: "cs_test_1",
        status: "complete",
        url: "https://checkout.stripe.test/expired-link",
        amount_total: 1899,
        metadata: {
          orderId: "order-1",
          workflowCaseId: "matter-1",
          caseApprovalId: "approval-1",
          connectorOperationId: "11111111-1111-4111-8111-111111111111",
          connectorRequestSha256: "a".repeat(64),
        },
      };
    },
  });
  assert.deepEqual(await resolve(staleCheckoutOperation()), {
    outcome: "confirmed_succeeded",
    result: {
      checkoutUrl: null,
      orderId: "order-1",
      packetSha256: "b".repeat(64),
      totalCents: 1899,
    },
  });
});

test("checkout reconciliation fails closed on ambiguity or receipt mismatch", async () => {
  let receiptReads = 0;
  const ambiguous = createConnectorReceiptResolver({
    async findCheckoutCandidates() { return [checkoutOrder, { ...checkoutOrder, id: "order-2" }]; },
    async retrieveCheckoutSession() { receiptReads += 1; throw new Error("must not be called"); },
  });
  const ambiguousResult = await ambiguous(staleCheckoutOperation());
  assert.equal(ambiguousResult.outcome, "requires_review");
  assert.equal(receiptReads, 0);

  const mismatched = createConnectorReceiptResolver({
    async findCheckoutCandidates() { return [checkoutOrder]; },
    async retrieveCheckoutSession() {
      return {
        id: "cs_test_1",
        status: "open",
        url: "https://checkout.stripe.test/cs_test_1",
        amount_total: 1999,
        metadata: {
          orderId: "order-1",
          workflowCaseId: "matter-1",
          caseApprovalId: "approval-1",
          connectorOperationId: "11111111-1111-4111-8111-111111111111",
          connectorRequestSha256: "a".repeat(64),
        },
      };
    },
  });
  assert.equal((await mismatched(staleCheckoutOperation())).outcome, "requires_review");

  const wrongOperation = createConnectorReceiptResolver({
    async findCheckoutCandidates() { return [checkoutOrder]; },
    async retrieveCheckoutSession() {
      return {
        id: "cs_test_1",
        status: "open",
        url: "https://checkout.stripe.test/cs_test_1",
        amount_total: 1899,
        metadata: {
          orderId: "order-1",
          workflowCaseId: "matter-1",
          caseApprovalId: "approval-1",
          connectorOperationId: "33333333-3333-4333-8333-333333333333",
          connectorRequestSha256: "a".repeat(64),
        },
      };
    },
  });
  assert.equal((await wrongOperation(staleCheckoutOperation())).outcome, "requires_review");
});

test("non-checkout operations remain review-only and never probe Stripe", async () => {
  let probes = 0;
  const resolve = createConnectorReceiptResolver({
    async findCheckoutCandidates() { probes += 1; return []; },
    async retrieveCheckoutSession() { probes += 1; throw new Error("must not be called"); },
  });
  const queued = createConnectorOperation({
    id: "22222222-2222-4222-8222-222222222222",
    kind: "mailing",
    ownerId: "owner-1",
    matterId: "matter-1",
    idempotencyKey: "mailing-retry-1",
    requestSha256: "c".repeat(64),
    now: "2026-09-27T10:00:00.000Z",
  });
  const operation = transitionConnectorOperation(queued, "running", { now: "2026-09-27T10:00:00.000Z" });
  assert.equal((await resolve(operation)).outcome, "requires_review");
  assert.equal(probes, 0);
});
