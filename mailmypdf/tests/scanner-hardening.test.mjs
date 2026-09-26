import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const SCANNER = "src/lib/secure-core/scanner.server.ts";
const DOCUMENTS = "../packages/documents/src/index.ts";

/* ═══════════════════════════════════════════════════════════
   Quarantine promotion gate

   Promotion to `clean` is the moment a document becomes usable
   for analysis, packet assembly and mailing. These tests fix
   what has to be true before that happens.
   ═══════════════════════════════════════════════════════════ */

describe("promotion requires more than a signature scan", () => {
  test("PDFs are checked for active content after the signature verdict", async () => {
    const scanner = await read(SCANNER);
    const documents = await read(DOCUMENTS);
    assert.match(scanner, /evaluateQuarantinedDocument/);
    assert.match(documents, /FORBIDDEN_PDF_TOKENS/);
    assert.match(documents, /PDF contains forbidden token/);
  });

  test("an unsafe PDF is recorded as infected, with the feature named", async () => {
    const documents = await read(DOCUMENTS);
    assert.match(documents, /securityStatus: "rejected"/);
    assert.match(documents, /status: "infected"/);
    assert.match(documents, /signature: integrity\.error\.message/);
    assert.match(documents, /mailmypdf-static-validation/);
  });

  test("hardening only overrides a clean verdict, never softens an infected one", async () => {
    const documents = await read(DOCUMENTS);
    const verifyAt = documents.indexOf("const integrity = verifyStoredDocument(document, bytes)");
    const scanAt = documents.indexOf("const verdict = await scanner.scan", verifyAt);
    assert.ok(verifyAt > 0 && scanAt > verifyAt, "structural validation must precede malware scanning");
    assert.match(documents.slice(verifyAt, scanAt), /securityStatus: "rejected"/);
  });
});

describe("fail-closed properties", () => {
  test("only an explicit clean verdict promotes a document", async () => {
    const scanner = await read(SCANNER);
    const documents = await read(DOCUMENTS);
    assert.match(documents, /verdict\.status === "clean" \? "clean" : "rejected"/);
    assert.match(scanner, /result\.status !== "clean" && result\.status !== "infected"/);
  });

  test("a scan failure returns the document to quarantine", async () => {
    const source = await read(SCANNER);
    const cat = source.slice(source.indexOf("} catch (error) {"));
    assert.match(cat, /security_status:\s*document\.deletion_requested_at\s*\? "deleting"\s*:\s*"quarantined"/);
  });

  test("a pending deletion is never promoted to clean", async () => {
    const source = await read(SCANNER);
    assert.match(source, /document\.deletion_requested_at\s*\?\s*"deleting"/);
  });

  test("stored bytes are re-hashed before they are scanned", async () => {
    const source = await read(DOCUMENTS);
    const verifyAt = source.indexOf("export function verifyStoredDocument");
    const hashAt = source.indexOf("computeSha256(bytes) !== document.sha256", verifyAt);
    const scanAt = source.indexOf("await scanner.scan(", hashAt);
    assert.ok(hashAt > 0 && scanAt > hashAt, "the integrity check must precede the scan");
  });

  test("the scanner endpoint must be HTTPS outside local development", async () => {
    const source = await read(SCANNER);
    assert.match(source, /Malware scanner must use HTTPS/);
    assert.match(source, /NODE_ENV !== "production" && url\.hostname === "127\.0\.0\.1"/);
  });
});

describe("privileged queries are type-checked", () => {
  test("the secure core no longer casts the admin client to any", async () => {
    for (const file of [
      SCANNER,
      "src/lib/secure-core/retention.server.ts",
      "src/routes/api/v2/privacy/export.ts",
      "src/routes/api/v2/documents/$id/download.ts",
    ]) {
      const source = await read(file);
      assert.doesNotMatch(
        source,
        /supabaseAdmin as any/,
        `${file} must not disable type checking on privileged queries`,
      );
    }
  });
});
