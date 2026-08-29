import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("preview and order creation share strict validation before storage", async () => {
  // After Phase 1 refactoring, order creation logic lives in mail.service.ts
  // and PDF validation lives in document.service.ts. We verify both.
  const mailService = await source("src/services/mail.service.ts");
  const docService = await source("src/services/document.service.ts");
  const validation = await source("src/lib/pdf-validation.server.ts");

  // DocumentService must call validatePdfForMailing
  assert.match(docService, /validatePdfForMailing/);

  // MailService must call validatePdf before uploadDocument (at least 2 paths: createOrderFromPdf + createOrderFromLetter)
  const validateCalls = [...mailService.matchAll(/this\.documents\.validatePdf\(/g)].map((m) => m.index);
  assert.ok(validateCalls.length >= 2, "preview and at least one order creation path must validate");

  const uploadCalls = [...mailService.matchAll(/this\.documents\.uploadDocument\(/g)].map((m) => m.index);

  for (const uploadIdx of uploadCalls) {
    // Find the nearest preceding validate call
    const precedingValidate = validateCalls.filter((v) => v < uploadIdx).pop();
    assert.ok(precedingValidate !== undefined, "every upload must be preceded by a validation call");
  }

  // Preview path also validates
  assert.match(mailService, /previewPdfPricing/);
  assert.match(mailService, /this\.documents\.validatePdf/);
});
