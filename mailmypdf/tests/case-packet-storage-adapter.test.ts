import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createScopedCasePacketStorageAdapter } from "../src/lib/secure-core/case-packet-storage-adapter";

const ownerId = "owner-a";
const matterId = "matter-a";
const row = {
  document_id: "document-a", role: "evidence" as const,
  evidence_kind: "tax_return", page_count: null, position: 0,
  sha256: "a".repeat(64), storage_path: `${ownerId}/document-a.pdf`,
  safe_filename: "tax-return.pdf", mime_type: "application/pdf",
};

function fixture() {
  let rows = [row];
  const signed: string[] = [];
  const measured: Array<[string, number]> = [];
  const adapter = createScopedCasePacketStorageAdapter({
    ownerId, matterId,
    loadDocuments: async () => rows,
    signUrl: async (path, ttl) => {
      signed.push(`${path}:${ttl}`);
      return `https://storage.example.test/${path}`;
    },
    savePageCount: async (id, pages) => { measured.push([id, pages]); },
  });
  return { adapter, signed, measured, setRows: (next: typeof rows) => { rows = next; } };
}

describe("owner/matter-bound packet storage (no provider side effects)", () => {
  test("reads only current owned evidence and issues a short-lived signed URL", async () => {
    const state = fixture();
    assert.deepEqual(await state.adapter.loadEligibleDocuments({ ownerId, matterId }), [row]);
    assert.equal(await state.adapter.createSignedReadUrl({
      ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
    }), `https://storage.example.test/${row.storage_path}`);
    assert.deepEqual(state.signed, [`${row.storage_path}:60`]);
  });
  test("rejects cross-owner/cross-matter access without touching storage", async () => {
    const state = fixture();
    await assert.rejects(() => state.adapter.loadEligibleDocuments({ ownerId: "other", matterId }));
    await assert.rejects(() => state.adapter.loadEligibleDocuments({ ownerId, matterId: "other" }));
    await assert.rejects(() => state.adapter.createSignedReadUrl({
      ownerId: "other", storagePath: row.storage_path, expiresInSeconds: 60,
    }));
    await assert.rejects(() => state.adapter.persistMeasuredPageCount({
      ownerId, matterId: "other", documentId: row.document_id, pageCount: 1,
    }));
    assert.deepEqual(state.signed, []);
    assert.deepEqual(state.measured, []);
  });
  test("refuses stale, revoked, traversal, and duplicate storage references", async () => {
    const state = fixture();
    state.setRows([]);
    await assert.rejects(() => state.adapter.createSignedReadUrl({
      ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
    }));
    state.setRows([row]);
    for (const path of ["other/document.pdf", `${ownerId}/../other.pdf`, `${ownerId}/a\\b.pdf`, `${ownerId}/bad\nname.pdf`]) {
      await assert.rejects(() => state.adapter.createSignedReadUrl({
        ownerId, storagePath: path, expiresInSeconds: 60,
      }));
    }
    state.setRows([row, { ...row, document_id: "document-b" }]);
    await assert.rejects(() => state.adapter.loadEligibleDocuments({ ownerId, matterId }));
    assert.deepEqual(state.signed, []);
  });
  test("persists page counts only for current eligible documents", async () => {
    const state = fixture();
    await state.adapter.persistMeasuredPageCount({ ownerId, matterId, documentId: row.document_id, pageCount: 3 });
    assert.deepEqual(state.measured, [[row.document_id, 3]]);
    for (const [id, count] of [["unknown", 2], [row.document_id, 0], [row.document_id, 201]] as const) {
      await assert.rejects(() => state.adapter.persistMeasuredPageCount({
        ownerId, matterId, documentId: id, pageCount: count,
      }));
    }
    assert.deepEqual(state.measured, [[row.document_id, 3]]);
  });
  test("rejects missing RPC data and malformed signed URLs", async () => {
    const state = fixture();
    state.setRows(null as unknown as typeof row[]);
    await assert.rejects(() => state.adapter.loadEligibleDocuments({ ownerId, matterId }));
    const invalidUrl = createScopedCasePacketStorageAdapter({
      ownerId, matterId, loadDocuments: async () => [row],
      signUrl: async () => "http://unsafe.example.test", savePageCount: async () => {},
    });
    await assert.rejects(() => invalidUrl.createSignedReadUrl({
      ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
    }));
  });
});
