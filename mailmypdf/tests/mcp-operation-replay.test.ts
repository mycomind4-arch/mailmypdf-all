import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { ConnectorOperation } from "@mailmypdf/workflows/connector-operation";
import { SupabaseConnectorOperationRepository } from "../src/lib/mcp/connector-operations.server";

mock.module("../src/lib/secure-core/auth.server.ts", { namedExports: {
  requireAuthenticatedUser: async () => ({ user: { id: "owner-1" }, supabase: {} }),
  AuthenticationError: class extends Error {},
} });

const { executeMcpTool, McpToolExecutionError } = await import("../src/lib/mcp/workflow-tools.server");

for (const state of ["failed", "cancelled"] as const) {
  test(`replayed ${state} operations return a tool error with an operation id`, async (t) => {
    t.mock.method(SupabaseConnectorOperationRepository.prototype, "create", async (operation: ConnectorOperation) => ({
      created: false,
      operation: { ...operation, state, revision: 3,
        ...(state === "failed" ? { error: { code: "REJECTED", message: "Rejected", retryable: false } } : {}),
      },
    }));
    await assert.rejects(
      executeMcpTool(new Request("https://mailmypdf.test/api/mcp"), "save_draft", {
        matter_id: "matter-1", idempotency_key: "same-draft-request", body_text: "Reviewed draft",
      }),
      (error: unknown) => {
        assert.ok(error instanceof McpToolExecutionError);
        assert.equal(error.status, 409);
        const details = error.details as { connectorOperation: { id: string; state: string }; connectorReplay: boolean };
        assert.equal(details.connectorOperation.state, state);
        assert.ok(details.connectorOperation.id);
        assert.equal(details.connectorReplay, true);
        return true;
      },
    );
  });
}
