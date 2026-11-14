import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { assemblePacket, PacketError, type PacketDocumentRow } from "../src/index.ts";

async function twoPagePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  pdf.addPage([612, 792]);
  return pdf.save();
}

function evidence(bytes: Uint8Array, excluded_pages?: readonly number[]): PacketDocumentRow {
  return {
    document_id: "owned-evidence-1",
    role: "evidence",
    evidence_kind: "other",
    page_count: 2,
    position: 0,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    storage_path: "owner-a/evidence.pdf",
    safe_filename: "evidence.pdf",
    mime_type: "application/pdf",
    excluded_pages,
  };
}

test("out-of-range and malformed PDF enclosure exclusions must not silently mail omitted pages", async () => {
  const response = await twoPagePdf();
  const attachment = await twoPagePdf();
  for (const excluded_pages of [[2], [-1], [0.5], [Number.NaN], ["1" as never]]) {
    await assert.rejects(
      () => assemblePacket(response, [evidence(attachment, excluded_pages)], async () => attachment),
      (error: unknown) => error instanceof PacketError && /invalid excluded page/i.test(error.message),
      `invalid evidence page exclusion ${String(excluded_pages[0])}`,
    );
  }
  const valid = await assemblePacket(response, [evidence(attachment, [1])], async () => attachment);
  assert.equal(valid.responsePages, 2);
  assert.equal(valid.supportingPages, 1);
  assert.equal(valid.manifest[0]?.pageCount, 1);
  const rendered = await PDFDocument.load(valid.bytes);
  assert.equal(rendered.getPageCount(), 3);
});

test("out-of-range and malformed response-letter exclusions must not silently mail omitted pages", async () => {
  const response = await twoPagePdf();
  for (const excludedResponsePages of [[2], [-1], [1.25], [Number.POSITIVE_INFINITY], ["0" as never]]) {
    await assert.rejects(
      () => assemblePacket(response, [], async () => { throw new Error("no attachments"); }, { excludedResponsePages }),
      (error: unknown) => error instanceof PacketError && /invalid excluded page/i.test(error.message),
      `invalid response page exclusion ${String(excludedResponsePages[0])}`,
    );
  }
  const valid = await assemblePacket(response, [], async () => { throw new Error("no attachments"); }, { excludedResponsePages: [1] });
  assert.equal(valid.responsePages, 1);
  assert.equal(valid.supportingPages, 0);
  assert.equal((await PDFDocument.load(valid.bytes)).getPageCount(), 1);
});
