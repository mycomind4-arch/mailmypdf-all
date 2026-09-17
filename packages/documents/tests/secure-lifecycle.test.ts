import assert from "node:assert/strict";
import test from "node:test";
import { computeSha256 } from "../src/index.js";
import { scanQuarantinedDocuments } from "../src/scanning/scanner.js";
import { purgeExpiredSecureDocuments } from "../src/retention/retention.js";

const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");

test("clean quarantined bytes are released only after integrity + scanner verdict", async () => {
  const verdicts: Array<{ documentId: string; securityStatus: string }> = [];
  const result = await scanQuarantinedDocuments({
    batchSize: 1,
    store: {
      async claim() {
        return [{
          id: "doc-1",
          ownerId: "user-1",
          workflowId: "ssdi-denial",
          storagePath: "user-1/doc-1/document.pdf",
          safeFilename: "document.pdf",
          mimeType: "application/pdf",
          sizeBytes: pdf.byteLength,
          sha256: computeSha256(pdf),
          retentionUntil: "2099-01-01T00:00:00.000Z",
          deletionRequestedAt: null,
          deletedAt: null,
        }];
      },
      async readBytes() { return pdf; },
      async saveVerdict(input) {
        verdicts.push({ documentId: input.documentId, securityStatus: input.securityStatus });
      },
      async removeObject() { throw new Error("clean file must not be removed"); },
      async saveFailure() { throw new Error("clean scan must not fail"); },
    },
    scanner: {
      async scan() { return { status: "clean", engine: "fixture-scanner" }; },
    },
  });

  assert.deepEqual(result, { claimed: 1, clean: 1, rejected: 0, deletionQueued: 0, failed: 0 });
  assert.deepEqual(verdicts, [{ documentId: "doc-1", securityStatus: "clean" }]);
});

test("retention removes bytes before writing sanitized tombstone", async () => {
  const sequence: string[] = [];
  const result = await purgeExpiredSecureDocuments({
    batchSize: 1,
    now: () => "2026-09-17T12:00:00.000Z",
    store: {
      async claimExpired() {
        return [{ id: "doc-1", ownerId: "user-1", storagePath: "user-1/doc-1/document.pdf", deletionAttempts: 1 }];
      },
      async removeObject() { sequence.push("remove-bytes"); },
      async recordDeletionFailure() { sequence.push("failure"); },
      async tombstone(input) {
        sequence.push(`tombstone:${input.tombstoneStoragePath}`);
      },
    },
  });

  assert.deepEqual(result, { claimed: 1, deleted: 1, failed: 0 });
  assert.deepEqual(sequence, ["remove-bytes", "tombstone:user-1/deleted/doc-1"]);
});
