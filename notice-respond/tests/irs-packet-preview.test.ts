import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generatePlainTextPdf, validatePdfForMailing } from "@mailmypdf/packet-builder";
import irsGeneralDefinition from "../workflows/irs-notice-response/definition";
import type { IrsGeneralSelectedEnclosure } from "../workflows/irs-notice-response/packet-preview";

const recipient = "Internal Revenue Service\nP.O. Box 1234\nAustin, TX 78714";
const input = {
  mail: {
    noticeDocumentId: "notice-current",
    analyzedNoticeDocumentId: "notice-current",
    noticeSha256: "a".repeat(64),
    analyzedNoticeSha256: "a".repeat(64),
    noticeStatus: "active",
    responsePath: "mail",
    instructionsConfirmed: true,
    mailPermitted: true,
    requiresDifferentProcedure: false,
    recipientAddress: recipient,
    recipientAddressSource: "controlling_notice",
    recipientAddressConfirmed: true,
    confirmedRecipientAddress: recipient,
    confirmedRecipientNoticeSha256: "a".repeat(64),
    confirmedRecipientAddressSource: "controlling_notice",
    confirmedRecipientResponsePath: "mail",
  },
  taxpayerName: "Example Taxpayer",
  returnAddress: "100 Example St\nEureka, CA 95501",
  responseBody: "Please review the enclosed records.",
} as const;

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function enclosure(id: string, position: number, bytes: Uint8Array): IrsGeneralSelectedEnclosure {
  return {
    explicitlySelected: true,
    securityCleared: true,
    document: {
      document_id: id,
      role: "evidence",
      evidence_kind: "supporting_record",
      page_count: 1,
      position,
      sha256: hash(bytes),
      storage_path: `owned/${id}.pdf`,
      safe_filename: `${id}.pdf`,
      mime_type: "application/pdf",
    },
  };
}

describe("general IRS notice selected-evidence packet preview", () => {
  it("assembles real selected PDFs in canonical order with measured pages and exact packet digest", async () => {
    const a = await generatePlainTextPdf("Record A");
    const b = await generatePlainTextPdf("Record B");
    const enclosures = [enclosure("record-b", 2, b), enclosure("record-a", 1, a)];
    const bytesById = new Map([["record-a", a], ["record-b", b]]);
    const seen: string[] = [];
    const result = await irsGeneralDefinition.preparePacketPreview(input, enclosures, async (row) => {
      seen.push(row.document_id);
      return bytesById.get(row.document_id)!;
    });
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected assembled packet");
    expect(seen).toEqual(["record-a", "record-b"]);
    expect(result.preview.status).toBe("draft_packet_preview_only");
    expect(result.preview.sourceNoticeSha256).toBe(input.mail.noticeSha256);
    expect(result.preview.recipientAddress).toBe(recipient);
    expect(result.preview.responsePages).toBeGreaterThanOrEqual(1);
    expect(result.preview.supportingPages).toBe(2);
    expect(result.preview.manifest.map((entry) => entry.documentId)).toEqual(["record-a", "record-b"]);
    expect(new TextDecoder().decode(result.preview.pdfBytes.subarray(0, 5))).toBe("%PDF-");
    expect(result.preview.packetSha256).toBe(hash(result.preview.pdfBytes));
    expect(Object.keys(result.preview)).not.toContain("approvalId");
    expect(Object.keys(result.preview)).not.toContain("checkoutUrl");
  });

  it("supports a letter-only packet without inventing an enclosure", async () => {
    const result = await irsGeneralDefinition.preparePacketPreview(input, [], async () => {
      throw new Error("Unexpected vault read");
    });
    expect(result.ready).toBe(true);
    if (!result.ready) throw new Error("Expected letter-only packet");
    expect(result.preview.supportingPages).toBe(0);
    expect(result.preview.manifest).toEqual([]);
  });

  it("rejects unselected, unscanned, duplicate, or subject-notice enclosures before any vault read", async () => {
    const bytes = await generatePlainTextPdf("Evidence");
    const good = enclosure("record", 0, bytes);
    const variants = [
      { docs: [{ ...good, explicitlySelected: false }], blocker: "enclosure_selection_unconfirmed" },
      { docs: [{ ...good, securityCleared: false }], blocker: "enclosure_security_unverified" },
      { docs: [{ ...good, document: { ...good.document, role: "subject_notice" as const } }], blocker: "enclosure_metadata_invalid" },
      { docs: [good, good], blocker: "enclosure_duplicate" },
      { docs: [{ ...good, document: { ...good.document, excluded_pages: [0] } }], blocker: "enclosure_metadata_invalid" },
    ];
    for (const { docs, blocker } of variants) {
      const result = await irsGeneralDefinition.preparePacketPreview(input, docs, async () => {
        throw new Error("Vault read must not occur");
      });
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers).toContain(blocker);
    }
  });

  it("rejects two selected document IDs pointing to one stored PDF before any vault read", async () => {
    // The direct packet-preview API must protect physical-mail integrity even
    // when callers do not use the additional owner-scoped case-store wrapper.
    const bytes = await generatePlainTextPdf("Shared supporting record");
    const first = enclosure("record-a", 0, bytes);
    const second = enclosure("record-b", 1, bytes);
    const aliased = {
      ...second,
      document: { ...second.document, storage_path: first.document.storage_path },
    };
    let vaultReads = 0;
    const result = await irsGeneralDefinition.preparePacketPreview(
      input,
      [first, aliased],
      async () => { vaultReads += 1; return bytes; },
    );
    expect(result.ready).toBe(false);
    expect(result.preview).toBeNull();
    expect(result.blockers).toContain("enclosure_duplicate");
    expect(vaultReads).toBe(0);
  });

  it("rejects duplicate PDF content stored under distinct IDs and paths before vault access", async () => {
    // Different uploads can have unique object keys but identical bytes.
    // Mailing the same selected PDF twice would inflate the packet and postage.
    const bytes = await generatePlainTextPdf("Repeated supporting record");
    const first = enclosure("record-a", 0, bytes);
    const second = enclosure("record-b", 1, bytes);
    expect(first.document.storage_path).not.toBe(second.document.storage_path);
    expect(first.document.sha256).toBe(second.document.sha256);
    let reads = 0;
    const result = await irsGeneralDefinition.preparePacketPreview(
      input,
      [first, second],
      async () => { reads += 1; return bytes; },
    );
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("enclosure_duplicate");
    expect(reads).toBe(0);
  });

  it("rejects overlapping page selections from identical PDF bytes before reading storage", async () => {
    // Different exclusion lists are not necessarily disjoint. Overlapping
    // pages would be printed twice and could inflate the real mailing cost.
    const bytes = await generatePlainTextPdf(
      Array.from({ length: 130 }, (_, index) => `Evidence line ${index + 1}`).join("\n"),
    );
    const { pageCount } = await validatePdfForMailing(bytes);
    expect(pageCount).toBeGreaterThan(2);
    const first = enclosure("record-a", 0, bytes);
    const second = enclosure("record-b", 1, bytes);
    const firstPages = { ...first, document: {
      ...first.document, page_count: pageCount, excluded_pages: [pageCount - 1],
    } };
    const overlappingPages = { ...second, document: {
      ...second.document, page_count: pageCount, excluded_pages: [0],
    } };
    let reads = 0;
    const overlap = await irsGeneralDefinition.preparePacketPreview(
      input, [firstPages, overlappingPages], async () => { reads += 1; return bytes; },
    );
    expect(overlap.ready).toBe(false);
    expect(overlap.blockers).toContain("enclosure_duplicate");
    expect(reads).toBe(0);

    // A deliberate, nonoverlapping split of one uploaded PDF remains valid.
    const lastPageOnly = { ...second, document: {
      ...second.document,
      page_count: pageCount,
      excluded_pages: Array.from({ length: pageCount - 1 }, (_, index) => index),
    } };
    const split = await irsGeneralDefinition.preparePacketPreview(
      input, [firstPages, lastPageOnly], async () => bytes,
    );
    expect(split.ready).toBe(true);
    if (!split.ready) throw new Error("Expected disjoint page selections to be printable");
    expect(split.preview.supportingPages).toBe(pageCount);
  });

  it("refuses stale notice or recipient confirmation before fetching attachments", async () => {
    const bytes = await generatePlainTextPdf("Evidence");
    const result = await irsGeneralDefinition.preparePacketPreview(
      { ...input, mail: { ...input.mail, noticeSha256: "b".repeat(64) } },
      [enclosure("record", 0, bytes)],
      async () => { throw new Error("Vault read must not occur"); },
    );
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("source_notice_digest_changed");
    expect(result.blockers).toContain("recipient_confirmation_stale");
  });

  it("fails closed on tampered stored bytes and unreadable PDF enclosures", async () => {
    const bytes = await generatePlainTextPdf("Original evidence");
    const row = enclosure("record", 0, bytes);
    for (const actual of [await generatePlainTextPdf("Tampered evidence"), new Uint8Array([1, 2, 3])]) {
      const result = await irsGeneralDefinition.preparePacketPreview(input, [row], async () => actual);
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers).toEqual(["packet_assembly_failed"]);
    }
  });
  it("refuses enclosure page-count metadata that disagrees with the stored PDF", async () => {
    // A stale one-page database record must not silently enclose two real pages.
    // This also protects approval/pricing from trusting a different page count
    // than the packet builder actually merged into the outgoing PDF.
    const bytes = await generatePlainTextPdf(
      Array.from({ length: 70 }, (_, index) => `Evidence line ${index + 1}`).join("\n"),
    );
    const measured = await validatePdfForMailing(bytes);
    expect(measured.pageCount).toBeGreaterThan(1);
    const stale = enclosure("record", 0, bytes);
    const result = await irsGeneralDefinition.preparePacketPreview(
      input,
      [{ ...stale, document: { ...stale.document, page_count: 1 } }],
      async () => bytes,
    );
    expect(result.ready).toBe(false);
    expect(result.preview).toBeNull();
    expect(result.blockers).toContain("enclosure_metadata_invalid");

    // Legitimate page removal still works: compare the measured included
    // pages to original metadata minus explicitly excluded original pages.
    const selected = await irsGeneralDefinition.preparePacketPreview(
      input,
      [{ ...stale, document: { ...stale.document, page_count: measured.pageCount, excluded_pages: [1] } }],
      async () => bytes,
    );
    expect(selected.ready).toBe(true);
    if (!selected.ready) throw new Error("Expected page-exclusion packet preview");
    expect(selected.preview.supportingPages).toBe(measured.pageCount - 1);
  });

  it("rejects invisible or bidirectional enclosure filename controls before vault access", async () => {
    // The packet builder stamps the filename onto the physical PDF. A stored
    // filename must not visually reverse or hide its true extension in that label.
    const bytes = await generatePlainTextPdf("Supporting evidence");
    // C1 controls (U+0080-U+009F) are also invisible/non-printing PDF label content.
    for (const unsafeName of ["statement\u202Efdp.exe", "record\u200B.pdf", "form\u2066.pdf", "record\u0085.pdf", "record\u009F.pdf"]) {
      const selected = enclosure("record", 0, bytes);
      let vaultReads = 0;
      const result = await irsGeneralDefinition.preparePacketPreview(
        input,
        [{ ...selected, document: { ...selected.document, safe_filename: unsafeName } }],
        async () => { vaultReads += 1; return bytes; },
      );
      expect(result.ready).toBe(false);
      expect(result.blockers).toContain("enclosure_metadata_invalid");
      expect(vaultReads).toBe(0);
    }
  });


  it("rejects enclosure labels too wide for the physical PDF footer before reading storage", async () => {
    // The shared packet builder stamps "Enclosure: <filename>" at x=36.
    // A 100-character wide-glyph filename fits the old 120-character metadata
    // limit but extends beyond the letter page and can overlap "Page N of M".
    const bytes = await generatePlainTextPdf("Supporting evidence");
    const selected = enclosure("record", 0, bytes);
    let reads = 0;
    const tooWide = await irsGeneralDefinition.preparePacketPreview(
      input,
      [{ ...selected, document: { ...selected.document, safe_filename: "W".repeat(100) + ".pdf" } }],
      async () => { reads += 1; return bytes; },
    );
    expect(tooWide.ready).toBe(false);
    expect(tooWide.blockers).toContain("enclosure_metadata_invalid");
    expect(reads).toBe(0);

    // A normal, readable enclosure filename remains printable and accepted.
    const ordinary = await irsGeneralDefinition.preparePacketPreview(
      input,
      [{ ...selected, document: { ...selected.document, safe_filename: "supporting-record.pdf" } }],
      async () => bytes,
    );
    expect(ordinary.ready).toBe(true);
  });

  it("fails closed on malformed persisted enclosure identity and filename metadata before storage reads", async () => {
    // A document-store adapter may return malformed JSON despite the TypeScript
    // contract. Never throw or stamp coerced values onto a physical-mail PDF.
    const bytes = await generatePlainTextPdf("Supporting record");
    const selected = enclosure("record", 0, bytes);
    const malformed = [
      { document_id: 42 },
      { document_id: {} },
      { storage_path: 42 },
      { storage_path: {} },
      { safe_filename: 42 },
      { safe_filename: {} },
    ];
    for (const change of malformed) {
      let reads = 0;
      const document = {
        ...selected.document,
        ...change,
      } as unknown as IrsGeneralSelectedEnclosure["document"];
      const result = await irsGeneralDefinition.preparePacketPreview(
        input,
        [{ ...selected, document }],
        async () => { reads += 1; return bytes; },
      );
      expect(result.ready).toBe(false);
      expect(result.preview).toBeNull();
      expect(result.blockers).toContain("enclosure_metadata_invalid");
      expect(reads).toBe(0);
    }
  });

});
