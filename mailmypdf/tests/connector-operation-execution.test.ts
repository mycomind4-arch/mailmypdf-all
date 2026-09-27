import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConnectorOperation } from "@mailmypdf/workflows/connector-operation";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";
import {
  executeDurableConnectorOperation,
  publicConnectorOperation,
  SupabaseConnectorOperationRepository,
} from "../src/lib/mcp/connector-operations.server";

for (const failure of ["none", "before-commit", "after-commit", "read-unavailable", "execute"] as const) {
  test(`operation execution handles ${failure} without duplicate actions`, async (t) => {
    let stored: ConnectorOperation | undefined;
    let executions = 0;
    const states: string[] = [];
    const prototype = SupabaseConnectorOperationRepository.prototype;
    t.mock.method(prototype, "create", async (operation: ConnectorOperation) => {
      if (stored) return { operation: stored, created: false };
      stored = operation;
      return { operation, created: true };
    });
    t.mock.method(prototype, "loadOwned", async (ownerId: string, id: string) => {
      if (failure === "read-unavailable") throw new Error("database unavailable");
      return stored?.ownerId === ownerId && stored.id === id ? stored : null;
    });
    t.mock.method(prototype, "save", async (operation: ConnectorOperation, revision: number) => {
      assert.equal(stored?.revision, revision);
      states.push(operation.state);
      if (operation.state === "succeeded" && ["before-commit", "read-unavailable"].includes(failure)) {
        throw new Error("database unavailable");
      }
      stored = operation;
      if (operation.state === "succeeded" && failure === "after-commit") {
        throw new Error("acknowledgement lost");
      }
      return operation;
    });
    const input = {
      context: { user: { id: "owner-1" } } as AuthenticatedUserContext,
      kind: "prepare_checkout" as const,
      matterId: "matter-1",
      idempotencyKey: "same-checkout",
      requestSha256: "a".repeat(64),
      execute: async () => {
        executions++;
        if (failure === "execute") throw new Error("action rejected");
        return { checkoutUrl: "https://checkout.example/session-1" };
      },
      mapError: () => ({ code: "ACTION_REJECTED", message: "Action rejected", retryable: false }),
    };
    if (failure === "execute") {
      await assert.rejects(executeDurableConnectorOperation(input), /action rejected/);
      assert.equal(stored?.state, "failed");
    } else {
      const result = await executeDurableConnectorOperation(input);
      const uncertain = failure === "before-commit" || failure === "read-unavailable";
      assert.equal(result.operation.state, uncertain ? "running" : "succeeded");
      assert.equal(result.output?.checkoutUrl, uncertain ? undefined : "https://checkout.example/session-1");
      assert.ok(!states.includes("failed"), "completed actions must never be marked failed");
      if (uncertain) {
        assert.match(publicConnectorOperation(result.operation).nextAction!, /do not repeat.*new idempotency key/);
      }
    }
    const replay = await executeDurableConnectorOperation(input);
    assert.equal(replay.replayed, true);
    assert.equal(executions, 1);
    assert.equal(replay.operation.state, stored?.state);
  });
}
