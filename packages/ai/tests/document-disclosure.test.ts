import assert from "node:assert/strict";
import test from "node:test";
import {
  executeWithVerifiedDocument,
  loadVerifiedDocumentForAi,
  type DocumentDisclosureMetadata,
} from "../src/document-disclosure.js";

const sha = "a".repeat(64);
const pdfBytes = new TextEncoder().encode("%PDF-1.7\nfixture");

function metadata(): DocumentDisclosureMetadata {
  return {
    id: "doc-1",
    ownerId: "user-1",
    storagePath: "user-1/doc-1/document.pdf",
    safeFilename: "document.pdf",
    mimeType: "application/pdf",
    sizeBytes: pdfBytes.byteLength,
    sha256: sha,
    securityStatus: "clean",
    retentionUntil: "2099-01-01T00:00:00.000Z",
    deletedAt: null,
    deletionRequestedAt: null,
  };
}

function store(current = metadata()) {
  return {
    async assertAttachedToOwnedMatter(input: { ownerId: string; matterId: string; documentId: string }) {
      assert.deepEqual(input, { ownerId: "user-1", matterId: "matter-1", documentId: "doc-1" });
    },
    async loadOwnedDocument() { return current; },
    async readBytes() { return pdfBytes; },
  };
}

test("verifies owner attachment, status, bytes and hash before disclosure", async () => {
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: store(),
    options: { sha256: async () => sha },
  });

  assert.equal(verified.documentId, "doc-1");
  assert.equal(verified.sizeBytes, pdfBytes.byteLength);
});

test("audit must succeed before provider execution", async () => {
  const documentStore = store();
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: documentStore,
    options: { sha256: async () => sha },
  });

  let executed = false;
  await assert.rejects(() => executeWithVerifiedDocument({
    ownerId: "user-1",
    matterId: "matter-1",
    document: verified,
    purpose: "notice_analysis",
    provider: "anthropic",
    model: "claude",
    systemPrompt: "Analyze the notice.",
    instruction: "Return facts.",
    store: documentStore,
    audit: { async record() { throw new Error("audit unavailable"); } },
    execute: async () => { executed = true; return "never"; },
  }));

  assert.equal(executed, false);
});

test("deletion requested after verification blocks disclosure", async () => {
  const current = metadata();
  const documentStore = store(current);
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: documentStore,
    options: { sha256: async () => sha },
  });
  current.deletionRequestedAt = "2026-09-17T12:00:00.000Z";

  await assert.rejects(() => executeWithVerifiedDocument({
    ownerId: "user-1",
    matterId: "matter-1",
    document: verified,
    purpose: "notice_analysis",
    provider: "anthropic",
    model: "claude",
    systemPrompt: "Analyze.",
    instruction: "Return facts.",
    store: documentStore,
    audit: { async record() {} },
    execute: async () => "should not run",
  }), /being deleted/i);
});
