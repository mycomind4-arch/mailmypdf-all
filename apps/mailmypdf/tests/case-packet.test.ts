import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createHash } from "node:crypto";

import {
  assemblePacket,
  PacketError,
  type PacketDocumentRow,
} from "../src/lib/secure-core/packet.server";
import {
  assertMailClass,
  assertRecipient,
  renderResponseLetter,
} from "../src/lib/secure-core/case-approval.server";
import { CaseError } from "../src/lib/secure-core/case.server";

/* ═══════════════════════════════════════════════════════════
   Packet assembly

   Two defects motivated this layer. The workflow charged for
   "supporting pages" it had no way to collect, and approval
   counted evidence *records* as pages while fulfillment mailed
   only the letter text. So these tests measure real pages out
   of real PDFs rather than asserting on source strings.
   ═══════════════════════════════════════════════════════════ */

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    pdf.addPage([612, 792]).drawText(`page ${i + 1}`, { x: 72, y: 700, size: 12, font });
  }
  return pdf.save({ useObjectStreams: false });
}

/** A 1x1 PNG. */
const PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
));

function row(over: Partial<PacketDocumentRow> & { sha256: string }): PacketDocumentRow {
  return {
    document_id: "11111111-1111-4111-8111-111111111111",
    role: "evidence",
    evidence_kind: "medical_records",
    page_count: null,
    position: 0,
    storage_path: "owner/doc/file.pdf",
    safe_filename: "records.pdf",
    mime_type: "application/pdf",
    ...over,
  } as PacketDocumentRow;
}

describe("response letter rendering", () => {
  test("produces a readable PDF and grows with the text", async () => {
    const short = await renderResponseLetter("Dear Administrative Law Judge,\n\nI am appealing.");
    const shortPages = (await PDFDocument.load(short)).getPageCount();
    assert.equal(shortPages, 1);

    const long = await renderResponseLetter(Array.from({ length: 400 }, (_, i) => `Paragraph ${i}.`).join("\n\n"));
    assert.ok((await PDFDocument.load(long)).getPageCount() > 1, "long drafts must paginate");
  });

  test("wraps long lines instead of overflowing a single line", async () => {
    const wall = "word ".repeat(400).trim();
    const pdf = await renderResponseLetter(wall);
    assert.ok((await PDFDocument.load(pdf)).getPageCount() >= 1);
  });
});

describe("packet assembly", () => {
  test("counts the pages actually enclosed, not the number of documents", async () => {
    const letter = await makePdf(2);
    const records = await makePdf(3);
    const statement = await makePdf(1);

    const documents = [
      row({ document_id: "11111111-1111-4111-8111-111111111111", sha256: sha(records), safe_filename: "records.pdf" }),
      row({ document_id: "22222222-2222-4222-8222-222222222222", sha256: sha(statement), safe_filename: "statement.pdf", position: 1 }),
    ];
    const bytes = new Map([[documents[0].document_id, records], [documents[1].document_id, statement]]);

    const packet = await assemblePacket(letter, documents, async (r) => bytes.get(r.document_id)!);

    assert.equal(packet.responsePages, 2);
    // Two documents, four pages. The old approval path would have said 2.
    assert.equal(packet.supportingPages, 4);
    assert.equal(packet.manifest.length, 2);
    assert.deepEqual(packet.manifest.map((m) => m.pageCount), [3, 1]);
    assert.equal((await PDFDocument.load(packet.bytes)).getPageCount(), 6);
  });

  test("the packet actually contains the attachments, not just the letter", async () => {
    const letter = await makePdf(1);
    const evidence = await makePdf(5);
    const doc = row({ sha256: sha(evidence) });

    const packet = await assemblePacket(letter, [doc], async () => evidence);
    const merged = await PDFDocument.load(packet.bytes);

    assert.equal(merged.getPageCount(), 6, "the mailed packet must carry the evidence pages");
  });

  test("an image attachment becomes exactly one page", async () => {
    const letter = await makePdf(1);
    const doc = row({ sha256: sha(PNG), mime_type: "image/png", safe_filename: "scan.png" });

    const packet = await assemblePacket(letter, [doc], async () => PNG);
    assert.equal(packet.supportingPages, 1);
    assert.equal((await PDFDocument.load(packet.bytes)).getPageCount(), 2);
  });

  test("refuses a document whose stored bytes no longer match its recorded hash", async () => {
    const letter = await makePdf(1);
    const original = await makePdf(2);
    const swapped = await makePdf(5);
    assert.notEqual(sha(original), sha(swapped), "fixtures must differ for this test to mean anything");
    const doc = row({ sha256: sha(original), safe_filename: "records.pdf" });

    await assert.rejects(
      () => assemblePacket(letter, [doc], async (r) => {
        // Simulates the stored object being replaced after intake recorded its hash.
        void r;
        return swapped;
      }),
      (error: unknown) => error instanceof PacketError && /integrity check/.test((error as Error).message),
    );
  });

  test("refuses a file type that cannot be mailed", async () => {
    const letter = await makePdf(1);
    const text = new TextEncoder().encode("plain text");
    const doc = row({ sha256: sha(text), mime_type: "text/plain", safe_filename: "notes.txt" });

    await assert.rejects(
      () => assemblePacket(letter, [doc], async () => text),
      (error: unknown) => error instanceof PacketError && /cannot be enclosed/.test((error as Error).message),
    );
  });

  test("refuses an unreadable attachment rather than silently dropping it", async () => {
    const letter = await makePdf(1);
    const junk = new TextEncoder().encode("%PDF-1.4 not really");
    const doc = row({ sha256: sha(junk) });

    await assert.rejects(
      () => assemblePacket(letter, [doc], async () => junk),
      (error: unknown) => error instanceof PacketError,
    );
  });

  test("a packet with no attachments is the letter alone", async () => {
    const letter = await makePdf(3);
    const packet = await assemblePacket(letter, []);
    assert.equal(packet.responsePages, 3);
    assert.equal(packet.supportingPages, 0);
    assert.deepEqual(packet.manifest, []);
  });

  test("the packet hash changes when an attachment changes", async () => {
    const letter = await makePdf(1);
    const a = await makePdf(1);
    const b = await makePdf(2);

    const first = await assemblePacket(letter, [row({ sha256: sha(a) })], async () => a);
    const second = await assemblePacket(letter, [row({ sha256: sha(b) })], async () => b);

    assert.notEqual(first.sha256, second.sha256, "approval must not survive a changed packet");
    assert.match(first.sha256, /^[0-9a-f]{64}$/);
  });
});

describe("approval input validation", () => {
  test("requires a complete recipient", () => {
    assert.throws(() => assertRecipient(null), CaseError);
    assert.throws(() => assertRecipient({ name: "SSA" }), CaseError);
    const recipient = assertRecipient({
      name: " Social Security Administration ", line1: "1 Main St", line2: "  ",
      city: "Baltimore", state: "MD", postal: "21235",
    });
    assert.equal(recipient.name, "Social Security Administration");
    assert.equal(recipient.line2, null);
  });

  test("accepts only real mail classes", () => {
    assert.equal(assertMailClass("certified"), "certified");
    assert.throws(() => assertMailClass("carrier-pigeon"), CaseError);
    assert.throws(() => assertMailClass(undefined), CaseError);
  });
});
