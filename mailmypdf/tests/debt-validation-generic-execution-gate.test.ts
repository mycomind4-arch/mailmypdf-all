import assert from "node:assert/strict";
import test from "node:test";
import {
  approvePacket,
  assertGenericCaseExecutionAllowed,
  materializeApprovedPacket,
} from "../src/lib/secure-core/case-approval.server";

/**
 * Offline owner-scoped Supabase double: the only allowed query is the case
 * identity lookup. Approval inserts, payment/order creation and provider calls
 * must remain unreachable for an unfinished debt-validation workflow.
 */
function fakeContext(workflowId: string, verticalId: string) {
  const calls = { caseReads: 0, otherReads: 0, orderClaims: 0, stripeSubmissions: 0, lobSubmissions: 0 };
  const context = {
    user: { id: "synthetic-owner" },
    supabase: {
      from(table: string) {
        if (table !== "workflow_cases") {
          calls.otherReads++;
          throw new Error("unexpected downstream table: " + table);
        }
        calls.caseReads++;
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() {
            return {
              data: {
                id: "synthetic-case",
                workflow_id: workflowId,
                vertical_id: verticalId,
                status: "drafted",
                created_at: "2026-10-30T00:00:00Z",
                updated_at: "2026-10-30T00:00:00Z",
              },
              error: null,
            };
          },
        };
      },
    },
  } as unknown as Parameters<typeof approvePacket>[1];
  return { context, calls };
}

test("generic case and MCP approval cannot bypass debt-validation notice/recipient binding", async () => {
  const { context, calls } = fakeContext("debt-validation", "dispute-mail");
  await assert.rejects(
    approvePacket({
      caseId: "synthetic-case",
      recipient: {
        name: "Synthetic Collector",
        line1: "PO Box 456",
        city: "Austin",
        state: "TX",
        postal: "78701",
      },
      mailClass: "standard",
      reviewed: { packetSha256: "a".repeat(64), totalCents: 999 },
    }, context),
    /Debt validation approval and checkout are not yet enabled/,
  );
  assert.equal(calls.caseReads, 1);
  assert.equal(calls.otherReads, 0);
  assert.equal(calls.orderClaims, 0);
  assert.equal(calls.stripeSubmissions, 0);
  assert.equal(calls.lobSubmissions, 0);
});

test("generic checkout cannot materialize a debt-validation approval or reach providers", async () => {
  const { context, calls } = fakeContext("debt-validation", "dispute-mail");
  // The real generic checkout route materializes an approved packet before
  // creating an order and opening a Stripe session. Simulate that sequencing
  // with explicit counters: none of the downstream callbacks may be reached.
  const attemptCheckout = async () => {
    await materializeApprovedPacket("synthetic-case", "synthetic-approval", context);
    calls.orderClaims++;
    calls.stripeSubmissions++;
    calls.lobSubmissions++;
  };
  await assert.rejects(attemptCheckout(), /Debt validation approval and checkout are not yet enabled/);
  assert.equal(calls.caseReads, 1);
  assert.equal(calls.otherReads, 0, "must reject before reading legacy approval rows");
  assert.equal(calls.orderClaims, 0);
  assert.equal(calls.stripeSubmissions, 0);
  assert.equal(calls.lobSubmissions, 0);
});

test("generic execution gate leaves existing other workflows unaffected", () => {
  for (const [workflow_id, vertical_id] of [
    ["cp14-response", "notice-respond"],
    ["cp2000-response", "notice-respond"],
    ["ssdi-reconsideration", "appeal-mail"],
    ["debt-validation", "other-vertical"],
  ]) {
    assert.doesNotThrow(() => assertGenericCaseExecutionAllowed({ workflow_id, vertical_id }));
  }
  assert.throws(
    () => assertGenericCaseExecutionAllowed({
      workflow_id: "debt-validation", vertical_id: "dispute-mail",
    }),
    /Debt validation approval and checkout are not yet enabled/,
  );
});
