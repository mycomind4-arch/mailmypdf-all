import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSecureDocumentPath,
  computeRetentionUntil,
  computeSha256,
  evaluateQuarantinedDocument,
  intakeDocumentToQuarantine,
  isDocumentDisclosable,
  shouldPurgeSecureDocument,
  type SecureDocumentEnvelope,
} from "../src/index.js";

const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");

test("secure intake records consent, uses an owner-scoped path, and registers quarantine metadata", async () => {
  const calls: string[] = [];
  const result = await intakeDocumentToQuarantine({
    ownerId: "user-1",
    workflowId: "cp2000-response",
    purpose: "source_notice",
    consent: true,
    filename: "notice.pdf",
    mimeType: "application/pdf",
    bytes: pdf,
    retentionUntil: computeRetentionUntil(30, new Date("2026-09-16T00:00:00Z")),
    documentId: "doc-1",
    now: "2026-09-16T00:00:00Z",
  }, {
    consents: { async recordConsent() { calls.push("consent"); return "consent-1"; } },
    storage: {
      async put(path) { calls.push("put:" + path); },
      async remove(path) { calls.push("remove:" + path); },
    },
    registry: {
      async register(input) { calls.push("register"); return input; },
    },
  });
  assert.equal(result.securityStatus, "quarantined");
  assert.equal(result.sha256, computeSha256(pdf));
  assert.equal(result.storagePath, "user-1/doc-1/notice.pdf");
  assert.deepEqual(calls, ["consent", "put:user-1/doc-1/notice.pdf", "register"]);
});

test("secure intake removes quarantined bytes when registration fails", async () => {
  const removed: string[] = [];
  await assert.rejects(() => intakeDocumentToQuarantine({
    ownerId: "user-1", workflowId: "w1", purpose: "evidence", consent: true,
    filename: "notice.pdf", mimeType: "application/pdf", bytes: pdf,
    retentionUntil: "2026-10-16T00:00:00Z", documentId: "doc-2", now: "2026-09-16T00:00:00Z",
  }, {
    consents: { async recordConsent() { return "c1"; } },
    storage: { async put() {}, async remove(path) { removed.push(path); } },
    registry: { async register() { throw new Error("db unavailable"); } },
  }));
  assert.deepEqual(removed, ["user-1/doc-2/notice.pdf"]);
});

test("security scan re-verifies bytes and fails closed on a hash mismatch", async () => {
  const document: SecureDocumentEnvelope = {
    id:"d",ownerId:"u",workflowId:"w",purpose:"evidence",safeFilename:"notice.pdf",
    mimeType:"application/pdf",sizeBytes:pdf.byteLength,sha256:computeSha256(pdf),
    storagePath:"u/d/notice.pdf",securityStatus:"quarantined",retentionUntil:"2026-10-16T00:00:00Z",
  };
  const tampered = new TextEncoder().encode("%PDF-1.4\ntampered\n%%EOF");
  const result = await evaluateQuarantinedDocument(document, tampered, {
    async scan() { throw new Error("scanner should not receive tampered bytes"); },
  });
  assert.equal(result.securityStatus, "rejected");
  assert.equal(result.verdict.engine, "mailmypdf-static-validation");
});

test("only clean, unexpired documents are disclosable and retention is purgeable", () => {
  const base={securityStatus:"clean" as const,retentionUntil:"2026-09-20T00:00:00Z",deletedAt:null,deletionRequestedAt:null};
  assert.equal(isDocumentDisclosable(base, Date.parse("2026-09-16T00:00:00Z")), true);
  assert.equal(isDocumentDisclosable(base, Date.parse("2026-09-21T00:00:00Z")), false);
  assert.equal(shouldPurgeSecureDocument(base, Date.parse("2026-09-21T00:00:00Z")), true);
  assert.throws(() => buildSecureDocumentPath("../user","doc","x.pdf"));
});
