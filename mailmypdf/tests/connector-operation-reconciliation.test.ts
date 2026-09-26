import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  reconcileInterruptedConnectorOperations,
  requireConnectorReconciliationAuthorization,
} from "../src/lib/mcp/connector-operation-reconciliation.server";

const routeSource = readFileSync(
  join(import.meta.dirname, "../src/routes/api/internal/reconcile-connector-operations.ts"),
  "utf8",
);
const serviceSource = readFileSync(
  join(import.meta.dirname, "../src/lib/mcp/connector-operation-reconciliation.server.ts"),
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
  assert.match(serviceSource, /requireReviewForStaleConnectorOperation/);
});

test("stale running scans use a partial database index", () => {
  assert.match(migration, /connector_operations_stale_running_idx/i);
  assert.match(migration, /where state = 'running'/i);
  assert.match(migration, /updated_at, id/i);
});
