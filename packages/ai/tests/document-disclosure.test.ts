import assert from "node:assert/strict";
import test from "node:test";
import {
  executeWithVerifiedDocument,
  loadVerifiedDocumentForAi,
  type DocumentDisclosureMetadata,
} from "../src/document-disclosure.js";

const sha = "a".repeat(64);
const changedSha = "b".repeat(64);
const pdfBytes = new TextEncoder().encode("%PDF-1.7\nfixture");

async function fixtureHash(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength !== pdfBytes.byteLength) return changedSha;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    if (bytes[index] !== pdfBytes[index]) return changedSha;
  }
  return sha;
}

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

const verificationOptions = { sha256: fixtureHash };

test("verifies owner attachment, status, bytes and hash before disclosure", async () => {
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: store(),
    options: verificationOptions,
  });

  assert.equal(verified.documentId, "doc-1");
  assert.equal(verified.sizeBytes, pdfBytes.byteLength);
});

test("fails closed if an owner-scoped adapter returns another owner's row", async () => {
  const wrongOwner = { ...metadata(), ownerId: "user-2", storagePath: "user-2/doc-1/document.pdf" };
  await assert.rejects(() => loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: store(wrongOwner),
    options: verificationOptions,
  }), /owner or identity/i);
});

test("audit must succeed before provider execution", async () => {
  const documentStore = store();
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: documentStore,
    options: verificationOptions,
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
    options: verificationOptions,
  }), /audit unavailable/);

  assert.equal(executed, false);
});

test("mutating verified in-memory bytes blocks model disclosure", async () => {
  const documentStore = store();
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: documentStore,
    options: verificationOptions,
  });
  verified.bytes[5] = verified.bytes[5]! ^ 1;

  let audited = false;
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
    audit: { async record() { audited = true; } },
    execute: async () => "should not run",
    options: verificationOptions,
  }), /bytes changed before disclosure/i);

  assert.equal(audited, false);
});

test("deletion requested after verification blocks disclosure", async () => {
  const current = metadata();
  const documentStore = store(current);
  const verified = await loadVerifiedDocumentForAi({
    ownerId: "user-1",
    matterId: "matter-1",
    documentId: "doc-1",
    store: documentStore,
    options: verificationOptions,
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
    options: verificationOptions,
  }), /being deleted/i);
});
