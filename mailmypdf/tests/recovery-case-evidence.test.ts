import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createCaseGoal } from "@mailmypdf/agent-runtime";
import type { AuthenticatedUserContext } from "../src/lib/secure-core/auth.server";
import { describeRecoveryCaseEvidence } from "../src/lib/mcp/recovery-case-evidence.server";
import { RecoveryCaseError } from "../src/lib/mcp/recovery-case-service";
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  id = "20000000-0000-4000-8000-000000000001",
  docId = "50000000-0000-4000-8000-000000000001";
const goal = () => ({
  ...createCaseGoal({
    id,
    ownerId: owner,
    objective: "Review",
    desiredOutcome: "Refund",
    category: "billing-recovery",
    now: "2026-10-04T08:00:00Z",
  }),
  evidenceIds: [docId],
});
function fixture(data: unknown, status = 200) {
  let url: URL | undefined;
  let calls = 0;
  const client = createClient("https://db.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        url = new URL(String(input));
        calls++;
        return new Response(JSON.stringify(data), {
          status,
          headers: { "content-type": "application/json" },
        });
      },
    },
  });
  return {
    context: { user: { id: owner }, supabase: client } as AuthenticatedUserContext,
    get url() {
      return url!;
    },
    get calls() {
      return calls;
    },
  };
}
test("document labels come only from owned linked metadata and contain no storage paths", async () => {
  const f = fixture([
    {
      id: docId,
      owner_id: owner,
      safe_filename: "Refund receipt.pdf",
      original_filename: "original.pdf",
      security_status: "clean",
      deleted_at: null,
      storage_path: "private/path",
    },
  ]);
  const result = await describeRecoveryCaseEvidence(f.context, goal());
  assert.deepEqual(result, [
    { id: docId, name: "Refund receipt.pdf", securityStatus: "clean", available: true },
  ]);
  assert.equal(f.url.searchParams.get("owner_id"), `eq.${owner}`);
  assert.equal(f.url.searchParams.get("id"), `in.(${docId})`);
  assert.equal(f.url.searchParams.get("select")?.includes("storage_path"), false);
});
test("missing or deleted evidence stays visibly unavailable rather than receiving a fabricated name", async () => {
  for (const rows of [
    [],
    [
      {
        id: docId,
        owner_id: owner,
        safe_filename: "Deleted.pdf",
        original_filename: "Deleted.pdf",
        security_status: "clean",
        deleted_at: "2026-10-04T08:00:00Z",
      },
    ],
  ]) {
    const result = await describeRecoveryCaseEvidence(fixture(rows).context, goal());
    assert.deepEqual(result, [
      { id: docId, name: "Document unavailable", securityStatus: "unavailable", available: false },
    ]);
  }
});
test("owner mismatches and unlinked rows fail closed without exposing document metadata", async () => {
  const f = fixture([]);
  await assert.rejects(
    describeRecoveryCaseEvidence(f.context, { ...goal(), ownerId: other }),
    (e) => e instanceof RecoveryCaseError && e.status === 403,
  );
  assert.equal(f.calls, 0);
  const foreign = fixture([
    {
      id: docId,
      owner_id: other,
      safe_filename: "Other owner",
      security_status: "clean",
      deleted_at: null,
    },
  ]);
  await assert.rejects(
    describeRecoveryCaseEvidence(foreign.context, goal()),
    /evidence.*unavailable/i,
  );
});
test("empty links need no lookup and provider failures return a generic error", async () => {
  const f = fixture([]);
  assert.deepEqual(
    await describeRecoveryCaseEvidence(f.context, { ...goal(), evidenceIds: [] }),
    [],
  );
  assert.equal(f.calls, 0);
  const failure = fixture({ message: "token=private" }, 500);
  await assert.rejects(
    describeRecoveryCaseEvidence(failure.context, goal()),
    (e) => e instanceof RecoveryCaseError && !e.message.includes("private"),
  );
});

test("pending deletion is unavailable even before the document is removed", async () => {
  const f = fixture([
    {
      id: docId,
      owner_id: owner,
      safe_filename: "Removing.pdf",
      security_status: "clean",
      deleted_at: null,
      deletion_requested_at: "2026-10-04T08:00:00Z",
    },
  ]);
  assert.deepEqual(await describeRecoveryCaseEvidence(f.context, goal()), [
    { id: docId, name: "Document unavailable", securityStatus: "unavailable", available: false },
  ]);
  assert.ok(f.url.searchParams.get("select")?.includes("deletion_requested_at"));
});

test("unlinked metadata fails closed and scan-pending documents cannot support confirmation", async () => {
  const unlinked = fixture([
    {
      id: "50000000-0000-4000-8000-000000000002",
      owner_id: owner,
      safe_filename: "Unlinked.pdf",
      security_status: "clean",
    },
  ]);
  await assert.rejects(describeRecoveryCaseEvidence(unlinked.context, goal()), /unavailable/);
  const f = fixture([
    {
      id: docId,
      owner_id: owner,
      safe_filename: "",
      original_filename: "Pending.pdf",
      security_status: "scanning",
      deleted_at: null,
    },
  ]);
  assert.deepEqual(await describeRecoveryCaseEvidence(f.context, goal()), [
    { id: docId, name: "Pending.pdf", securityStatus: "scanning", available: false },
  ]);
});
