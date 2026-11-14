import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { createScopedCasePacketStorageAdapter } from "../src/lib/secure-core/case-packet-storage-adapter";

const ownerId = "owner-a";
const matterId = "matter-a";
const storageOrigin = "https://storage.example.test";
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
    ownerId, matterId, expectedSignedUrlOrigin: storageOrigin,
    loadDocuments: async () => rows,
    signUrl: async (path, ttl) => {
      signed.push(`${path}:${ttl}`);
      return `${storageOrigin}/storage/v1/object/sign/secure-documents/${path}?token=fixture`;
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
    }), `${storageOrigin}/storage/v1/object/sign/secure-documents/${row.storage_path}?token=fixture`);
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
      ownerId, matterId, expectedSignedUrlOrigin: storageOrigin,
      loadDocuments: async () => [row],
      signUrl: async () => "http://unsafe.example.test", savePageCount: async () => {},
    });
    await assert.rejects(() => invalidUrl.createSignedReadUrl({
      ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
    }));
  });
  test("allows the local Supabase emulator but not remote HTTP signed URLs", async () => {
    const local = createScopedCasePacketStorageAdapter({
      ownerId, matterId, expectedSignedUrlOrigin: "http://127.0.0.1:54321",
      loadDocuments: async () => [row],
      signUrl: async () => "http://127.0.0.1:54321/storage/v1/object/sign/example",
      savePageCount: async () => {},
    });
    assert.match(await local.createSignedReadUrl({
      ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
    }), /^http:\/\/127\.0\.0\.1/);
  });

  test("pins signed PDF reads to the configured Storage origin and endpoint", async () => {
    for (const signedUrl of [
      "https://evil.example.test/storage/v1/object/sign/secure-documents/owner-a/document-a.pdf",
      "https://storage.example.test.evil.test/storage/v1/object/sign/secure-documents/owner-a/document-a.pdf",
      "https://storage.example.test/api/private",
      "https://storage.example.test/storage/v1/object/public/secure-documents/owner-a/document-a.pdf",
      "https://user:pass@storage.example.test/storage/v1/object/sign/secure-documents/owner-a/document-a.pdf",
    ]) {
      const adapter = createScopedCasePacketStorageAdapter({
        ownerId, matterId, expectedSignedUrlOrigin: storageOrigin,
        loadDocuments: async () => [row],
        signUrl: async () => signedUrl,
        savePageCount: async () => {},
      });
      await assert.rejects(() => adapter.createSignedReadUrl({
        ownerId, storagePath: row.storage_path, expiresInSeconds: 60,
      }), signedUrl);
    }
  });

  test("rejects missing or unsafe configured storage origins", () => {
    for (const origin of [
      "", "http://storage.example.test", "https://user:pass@storage.example.test",
      "https://storage.example.test/path", "https://storage.example.test/?token=secret",
    ]) {
      assert.throws(() => createScopedCasePacketStorageAdapter({
        ownerId, matterId, expectedSignedUrlOrigin: origin,
        loadDocuments: async () => [row],
        signUrl: async () => "https://storage.example.test/storage/v1/object/sign/example",
        savePageCount: async () => {},
      }), origin);
    }
  });

  test("real preview and approval paths both use the scoped storage bridge", () => {
    const approvalSource = readFileSync(new URL(
      "../src/lib/secure-core/case-approval.server.ts", import.meta.url,
    ), "utf8");
    const packetSource = readFileSync(new URL(
      "../src/lib/secure-core/packet.server.ts", import.meta.url,
    ), "utf8");
    assert.equal((approvalSource.match(/await assembleOwnedCasePacket\(caseId, letter, documents, context\)/g) ?? []).length, 2);
    assert.match(packetSource, /loadDocuments: \(\) => loadPacketDocuments\(caseId, context\)/);
    assert.match(packetSource, /createScopedCasePacketStorageAdapter/);
  });
});
