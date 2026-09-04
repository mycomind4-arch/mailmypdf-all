import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";

import { findUnsafePdfFeature } from "../src/lib/pdf-validation.server";

/* ═══════════════════════════════════════════════════════════
   PDF structural safety

   A signature scanner has no opinion about a PDF carrying
   /JavaScript or an /OpenAction that launches a file — those
   are legitimate PDF features, not malware. But this is a
   document that gets merged into a packet and mailed, so a
   clean ClamAV verdict is necessary and not sufficient.
   ═══════════════════════════════════════════════════════════ */

async function realPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save({ useObjectStreams: false });
}

/** Splices a token into a real PDF's body, as an attacker-supplied file would carry it. */
function withToken(bytes: Uint8Array, token: string): Uint8Array {
  const text = Buffer.from(bytes).toString("latin1");
  const at = text.indexOf("%%EOF");
  const spliced = `${text.slice(0, at)}\n1 0 obj\n<< ${token} 1 0 R >>\nendobj\n${text.slice(at)}`;
  return new Uint8Array(Buffer.from(spliced, "latin1"));
}

describe("findUnsafePdfFeature", () => {
  test("a plain PDF is accepted", async () => {
    assert.equal(findUnsafePdfFeature(await realPdf()), null);
  });

  test("active-content tokens are each reported", async () => {
    const base = await realPdf();
    for (const token of [
      "/JavaScript", "/Launch", "/OpenAction", "/RichMedia",
      "/EmbeddedFile", "/SubmitForm", "/ImportData", "/GoToE",
    ]) {
      const found = findUnsafePdfFeature(withToken(base, token));
      assert.ok(found, `${token} must be reported`);
      assert.match(found, /^ActiveContent\./, `${token} produced ${found}`);
    }
  });

  test("the reported reason names the feature, for the audit trail", async () => {
    const found = findUnsafePdfFeature(withToken(await realPdf(), "/JavaScript"));
    assert.equal(found, "ActiveContent.JavaScript");
  });

  test("an encrypted PDF is refused", async () => {
    assert.equal(findUnsafePdfFeature(withToken(await realPdf(), "/Encrypt")), "Encrypted");
  });

  test("something that is not a PDF is refused", () => {
    const notPdf = new Uint8Array(Buffer.from("GIF89a" + "x".repeat(200)));
    assert.equal(findUnsafePdfFeature(notPdf), "MissingHeader");
  });

  test("a truncated PDF is refused", async () => {
    const bytes = await realPdf();
    assert.equal(findUnsafePdfFeature(bytes.slice(0, bytes.length - 40)), "MissingEndOfFile");
  });

  test("an empty or tiny file is refused", () => {
    assert.equal(findUnsafePdfFeature(new Uint8Array(0)), "TooSmall");
    assert.equal(findUnsafePdfFeature(new Uint8Array(Buffer.from("%PDF-"))), "TooSmall");
  });

  test("size is not judged here — the caller decides", async () => {
    // The mailing path caps at 10MB and the vault at 50MB; a shared detector
    // must not impose either.
    const base = Buffer.from(await realPdf()).toString("latin1");
    const padded = base.replace("%%EOF", `${"% padding\n".repeat(200_000)}%%EOF`);
    assert.equal(findUnsafePdfFeature(new Uint8Array(Buffer.from(padded, "latin1"))), null);
  });
});
