import assert from "node:assert/strict";
import { mock, test } from "node:test";

const id = "10000000-0000-4000-8000-000000000001";
const address = { name: "Test", line1: "1 Main St", line2: null, city: "Austin", state: "TX", postal: "78701" };
let row: any;
let error: any;
let writes: any[];
let filters: Record<string, unknown>;
let verified = true;
const request = new Request("https://example.test/mcp");
function reset() {
  row = { id, revision: 1, address, verification: { status: "verified" } };
  error = null; writes = []; filters = {}; verified = true;
}
mock.module("../src/lib/secure-core/auth.server.ts", { namedExports: {
  requireAuthenticatedUser: async () => ({ user: { id: "owner-a" } }),
} });
mock.module("../src/lib/mcp/direct-mail.server.ts", { namedExports: {
  verifiedAddressForSaving: async (_req: Request, order: string, kind: string) => {
    assert.equal(order, "order-1"); assert.equal(kind, "sender");
    if (!verified) throw new Error("Review required");
    return { address, verification: { status: "verified", source_order_id: order } };
  },
} });
mock.module("../src/integrations/supabase/client.server.ts", { namedExports: { supabaseAdmin: {
  from(table: string) {
    assert.equal(table, "saved_mailing_addresses");
    const query: any = { select() { return query; }, eq(k: string, v: unknown) { filters[k] = v; return query; },
      is(k: string, v: unknown) { filters[k] = v; return query; }, order() { return query; }, limit() { return query; },
      maybeSingle: async () => ({ data: row, error }),
      then(resolve: any, reject: any) { return Promise.resolve({ data: row ? [row] : [], error }).then(resolve, reject); },
    }; return query;
  },
  rpc: (name: string, args: any) => { assert.equal(name, "write_saved_mailing_address"); writes.push(args); return { single: async () => ({ data: row, error }) }; },
} } });
const service = await import("../src/lib/mcp/saved-addresses.server.ts");
const save = () => ({ id, expected_revision: 0, kind: "sender", label: "Business", order_id: "order-1", is_default: true, user_confirmed: true });

test("list explicitly separates owner, kind and archived records", async () => {
  reset(); const result = await service.listSavedAddresses(request, { kind: "recipient" });
  assert.equal(result.addresses.length, 1);
  assert.deepEqual(filters, { owner_id: "owner-a", kind: "recipient", archived_at: null });
  assert.match(result.nextAction, /even for a default/);
});
test("no silent save or client supplied verification", async () => {
  reset();
  await assert.rejects(service.saveAddress(request, { ...save(), user_confirmed: false }), /confirmation/);
  await assert.rejects(service.saveAddress(request, { ...save(), verification: { status: "verified" } }), /Invalid/);
  assert.equal(writes.length, 0);
});
test("save copies only verified owned order evidence", async () => {
  reset(); await service.saveAddress(request, save());
  assert.deepEqual(writes[0].p_address, address);
  assert.equal(writes[0].p_owner, "owner-a");
  assert.equal(writes[0].p_verification.source_order_id, "order-1");
  verified = false; await assert.rejects(service.saveAddress(request, save()), /Review required/);
  assert.equal(writes.length, 1);
});
test("recipient cannot become default sender", async () => {
  reset(); await assert.rejects(service.saveAddress(request, { ...save(), kind: "recipient" }), /Only sender/);
  assert.equal(writes.length, 0);
});
test("stale writes return safe conflict and preserve retry identity", async () => {
  reset(); error = { code: "40001", message: "private DB details" };
  await assert.rejects(service.saveAddress(request, save()), (err: any) => err.status === 409 && !err.message.includes("private DB"));
  assert.equal(writes[0].p_id, id);
});
test("archive requires consent and exact revision, never changes orders", async () => {
  reset(); await assert.rejects(service.archiveAddress(request, { id, expected_revision: 1 }), /confirmation/);
  row.archived_at = new Date().toISOString();
  const result = await service.archiveAddress(request, { id, expected_revision: 1, user_confirmed: true });
  assert.equal(result.archived, true); assert.equal(writes[0].p_archive, true);
  assert.equal(writes[0].p_owner, "owner-a"); assert.equal(writes[0].p_revision, 1);
});
test("selected snapshot checks owner, kind, revision and exact address", async () => {
  reset(); const selected = await service.requireSavedAddressSnapshot("owner-a", "sender", { id, revision: 1 }, address);
  assert.equal(selected?.id, id);
  assert.deepEqual(filters, { owner_id: "owner-a", kind: "sender", id, archived_at: null });
  await assert.rejects(service.requireSavedAddressSnapshot("owner-a", "sender", { id, revision: 2 }, address), /changed/);
  await assert.rejects(service.requireSavedAddressSnapshot("owner-a", "sender", { id, revision: 1 }, { ...address, postal: "10001" }), /changed/);
  row = null; await assert.rejects(service.requireSavedAddressSnapshot("owner-a", "sender", { id, revision: 1 }, address), /unavailable/);
});
test("manual entry stays independent of saved-address storage", async () => {
  reset(); assert.equal(await service.requireSavedAddressSnapshot("owner-a", "sender", undefined, address), null);
  assert.deepEqual(filters, {});
});

test("missing write receipts never report success", async () => {
  reset(); row = null;
  await assert.rejects(service.saveAddress(request, save()), /outcome is uncertain/);
  await assert.rejects(service.archiveAddress(request, { id, expected_revision: 1, user_confirmed: true }), /outcome is uncertain/);
});
