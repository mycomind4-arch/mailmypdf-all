import assert from "node:assert/strict";
import test from "node:test";
import { documentSourceProvenance, normalizeDocumentSource } from "../src/document-source.js";

test("normalizes Google Drive into opaque source provenance without credentials", () => {
  const source = normalizeDocumentSource({
    kind: "google_drive",
    role: "supporting",
    sourceId: "drive-file-123",
    provider: "google",
    fileName: "invoice.pdf",
    mimeType: "application/pdf",
    importedAt: "2026-09-28T02:00:00.000Z",
    metadata: { workspace: "business" },
  });
  assert.equal(source.sourceId, "drive-file-123");
  assert.equal(source.provider, "google");
  assert.equal(documentSourceProvenance(source).role, "supporting");
});

test("rejects source metadata containing credentials or fetch URLs", () => {
  assert.throws(() => normalizeDocumentSource({
    kind: "external_provider",
    role: "primary",
    sourceId: "file-1",
    provider: "example",
    fileName: "notice.pdf",
    metadata: { access_token: "secret" },
  }), /must not contain credentials/i);
  assert.throws(() => normalizeDocumentSource({
    kind: "external_provider",
    role: "primary",
    sourceId: "file-1",
    provider: "example",
    fileName: "notice.pdf",
    metadata: { download_url: "https://example.test/file" },
  }), /fetch URLs/i);
});

test("provider-specific source kinds require canonical provider identity", () => {
  assert.throws(() => normalizeDocumentSource({
    kind: "google_drive", role: "primary", sourceId: "1", provider: "other", fileName: "x.pdf",
  }), /provider google/i);
});
