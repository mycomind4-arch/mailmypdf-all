/**
 * @mailmypdf/packet-builder
 *
 * The canonical PDF assembly primitives for MailMyPDF: turning a plain-text
 * draft into a printable letter PDF, and merging a response letter with a
 * user's approved supporting documents into one mail-ready packet.
 *
 * This is the single production packet builder. It previously lived only
 * inside apps/mailmypdf's secure-core (coupled to nothing storage-specific --
 * `readBytes` was already injectable), which is what let it move here
 * unchanged. apps/mailmypdf re-exports these functions from its own
 * `lib/secure-core/packet.server.ts` and `lib/letter-pdf.server.ts` so every
 * existing call site and test keeps working; the Studio workflow acceptance
 * engine (@mailmypdf/workflow-acceptance) imports directly from here so that
 * acceptance tests merge PDFs with the exact same code production uses,
 * never a test-only re-implementation (see build-specs and
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md).
 *
 * NOTE: pdf-lib is imported dynamically inside functions, matching the
 * original code, to avoid bundlers hoisting tslib into SSR/Workers chunks.
 */

import { computeSha256 } from "@mailmypdf/documents";

// -- Letter PDF generation ---------------------------------------------------

const PAGE_WIDTH = 612; // 8.5" x 72
const PAGE_HEIGHT = 792; // 11" x 72
const MARGIN = 72; // 1"
const FONT_SIZE = 12;
const LINE_HEIGHT = 16;
const MAX_LINES_PER_PAGE = 38;

// Every PDF this file produces is submitted to Lob with
// address_placement: "top_first_page" (see apps/mailmypdf's lob-adapter),
// which overlays Lob's own return/recipient address block into the top of
// page 1. That zone must stay clear of our own content or the overlay
// covers — or is covered by — the first lines of the letter. Lob's
// guidance for this placement is a minimum 2" clear at the top of page 1;
// every other page keeps the normal 1" margin.
const LOB_FIRST_PAGE_TOP_MARGIN = 144; // 2"
const FIRST_PAGE_MAX_LINES = Math.floor((PAGE_HEIGHT - LOB_FIRST_PAGE_TOP_MARGIN - MARGIN) / LINE_HEIGHT);

/**
 * Generates a PDF from plain text letter content.
 * Formats it as a standard business letter: date, addresses, body, signature.
 * Returns the PDF bytes.
 */
export async function generateLetterPdf(args: {
  letterText: string;
  senderName: string;
  senderLine1: string;
  senderLine2?: string | null;
  senderCity: string;
  senderState: string;
  senderPostal: string;
  recipientName: string;
  recipientLine1: string;
  recipientLine2?: string | null;
  recipientCity: string;
  recipientState: string;
  recipientPostal: string;
}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const header: string[] = [
    today,
    "",
    args.senderName,
    args.senderLine1,
  ];
  if (args.senderLine2) header.push(args.senderLine2);
  header.push(`${args.senderCity}, ${args.senderState} ${args.senderPostal}`);
  header.push("");
  header.push(args.recipientName);
  header.push(args.recipientLine1);
  if (args.recipientLine2) header.push(args.recipientLine2);
  header.push(`${args.recipientCity}, ${args.recipientState} ${args.recipientPostal}`);
  header.push("");

  const bodyLines = args.letterText.split("\n");
  const allLines = [...header, ...bodyLines];

  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; ) {
    const capacity = pages.length === 0 ? FIRST_PAGE_MAX_LINES : MAX_LINES_PER_PAGE;
    pages.push(allLines.slice(i, i + capacity));
    i += capacity;
  }
  if (pages.length === 0) pages.push([""]);

  pages.forEach((pageLines, pageIndex) => {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - (pageIndex === 0 ? LOB_FIRST_PAGE_TOP_MARGIN : MARGIN);

    for (const line of pageLines) {
      const wrappedLines = wrapText(line, font, FONT_SIZE, PAGE_WIDTH - 2 * MARGIN);
      for (const wrapped of wrappedLines) {
        page.drawText(wrapped, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0, 0, 0),
        });
        y -= LINE_HEIGHT;
      }
    }
  });

  return doc.save();
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Generates a printable PDF from an already-composed text document.
 *
 * This is used by the MailMyPDF API boundary when a trusted vertical submits
 * a text draft. The stored/provided document is normalized to PDF before it
 * can reach Lob, so raw text is never sent to the physical-mail provider.
 */
export async function generatePlainTextPdf(text: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const safeText = normalizeForStandardPdfFont(text);
  const sourceLines = splitIntoLines(safeText);

  // This may be submitted to Lob as page 1 (see the Lob top_first_page note
  // on LOB_FIRST_PAGE_TOP_MARGIN above), so the very first page reserves
  // that space; every page after it uses the normal 1" margin.
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - LOB_FIRST_PAGE_TOP_MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  for (const sourceLine of sourceLines) {
    const wrapped = wrapText(
      sourceLine,
      font,
      FONT_SIZE,
      PAGE_WIDTH - 2 * MARGIN,
    );

    for (const line of wrapped) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      page.drawText(line, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }
  }

  return doc.save();
}

/** Splits on CR, LF, or CRLF without depending on regex escape sequences. */
function splitIntoLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (code === 13) {
      // CR: consume an immediately-following LF as one line break.
      lines.push(current);
      current = "";
      if (text.charCodeAt(i + 1) === 10) i += 1;
    } else if (code === 10) {
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  lines.push(current);
  return lines;
}

// Smart-punctuation code points normalized to their plain-ASCII equivalents,
// expressed as character codes (not literal escapes) so this file has no
// escape-sequence ambiguity: left/right single quote, left/right double
// quote, en dash/em dash, ellipsis, bullet, non-breaking space.
const SMART_CHAR_REPLACEMENTS: Array<{ codes: number[]; replacement: string }> = [
  { codes: [0x2018, 0x2019], replacement: "'" },
  { codes: [0x201c, 0x201d], replacement: '"' },
  { codes: [0x2013, 0x2014], replacement: "-" },
  { codes: [0x2026], replacement: "..." },
  { codes: [0x2022], replacement: "*" },
  { codes: [0x00a0], replacement: " " },
];

function normalizeForStandardPdfFont(text: string): string {
  let normalized = text;
  for (const { codes, replacement } of SMART_CHAR_REPLACEMENTS) {
    for (const code of codes) {
      normalized = normalized.split(String.fromCharCode(code)).join(replacement);
    }
  }

  // Standard PDF Times Roman uses WinAnsi: tab (0x09), LF (0x0A), CR (0x0D),
  // and the printable range 0x20-0xFF. Any other code point the embedded
  // font cannot encode is replaced rather than silently corrupting the PDF.
  let result = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const allowed = code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code <= 0xff);
    result += allowed ? normalized[i] : "?";
  }
  return result;
}

/**
 * Estimates the page count of a generated letter.
 * Used for pricing before actual PDF generation.
 */
export function estimateLetterPageCount(letterText: string): number {
  const lines = letterText.split("\n");
  const totalLines = lines.length + 14;
  return Math.max(1, Math.ceil(totalLines / MAX_LINES_PER_PAGE));
}

// -- Packet assembly ----------------------------------------------------------
//
// A packet is the exact PDF a user approves and the mailing provider
// receives: the generated response letter followed by every attachment the
// user chose to enclose, in order. Page counts are *measured here from the
// stored bytes*, not supplied by the caller -- callers should recount
// independently before approval so a client cannot approve one packet and
// have another mailed.

const MAX_ATTACHMENT_PAGES = 200;
const MAX_PACKET_PAGES = 400;

export class PacketError extends Error {}

export interface PacketDocumentRow {
  document_id: string;
  role: "subject_notice" | "evidence";
  evidence_kind: string | null;
  page_count: number | null;
  position: number;
  sha256: string;
  storage_path: string;
  safe_filename: string;
  mime_type: string;
  /**
   * 0-based indices, into this document's own pages, that the user removed
   * in the packet preview before mailing (e.g. dropping an irrelevant page
   * from a multi-page scan). Omit or leave empty to enclose every page.
   * Ignored for images, which are always exactly one page.
   */
  excluded_pages?: readonly number[];
}

export interface PacketManifestEntry {
  documentId: string;
  role: PacketDocumentRow["role"];
  evidenceKind: string | null;
  filename: string;
  sha256: string;
  pageCount: number;
}

export interface AssembledPacket {
  bytes: Uint8Array;
  sha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: PacketManifestEntry[];
}

export type DocumentByteReader = (row: PacketDocumentRow) => Promise<Uint8Array>;

async function loadPdfLib() {
  return import("pdf-lib");
}

// PDFDocument's constructor is private, so the document type is taken from the
// factory rather than through InstanceType.
type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfLib>>["PDFDocument"]["create"]>>;

/**
 * pdf-lib will happily "load" some malformed input and only fail later while
 * copying pages, so parsing and copying are guarded together. A document we
 * cannot read is refused, never silently dropped from the packet.
 */
async function appendPdf(
  packet: PdfDoc,
  bytes: Uint8Array,
  row: PacketDocumentRow,
): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  try {
    const attachment = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    const allIndices = attachment.getPageIndices();
    if (allIndices.length < 1) throw new PacketError(`${row.safe_filename} has no pages`);
    if (allIndices.length > MAX_ATTACHMENT_PAGES) {
      throw new PacketError(`${row.safe_filename} exceeds ${MAX_ATTACHMENT_PAGES} pages`);
    }
    const excluded = new Set(row.excluded_pages ?? []);
    const indices = allIndices.filter((i) => !excluded.has(i));
    if (indices.length < 1) throw new PacketError(`${row.safe_filename} has no pages left after removing pages in the preview`);
    const copied = await packet.copyPages(attachment, indices);
    for (const page of copied) packet.addPage(page);
    return copied.length;
  } catch (error) {
    if (error instanceof PacketError) throw error;
    throw new PacketError(`${row.safe_filename} is not a readable PDF`);
  }
}

async function appendImage(
  packet: PdfDoc,
  bytes: Uint8Array,
  row: PacketDocumentRow,
): Promise<number> {
  try {
    const image = row.mime_type === "image/png"
      ? await packet.embedPng(bytes)
      : await packet.embedJpg(bytes);
    // US Letter, image fitted inside a half-inch margin.
    const page = packet.addPage([612, 792]);
    const scale = Math.min((612 - 72) / image.width, (792 - 72) / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (612 - width) / 2, y: (792 - height) / 2, width, height });
    return 1;
  } catch (error) {
    if (error instanceof PacketError) throw error;
    throw new PacketError(`${row.safe_filename} is not a readable image`);
  }
}

/**
 * Builds the combined packet and measures every page in it.
 *
 * `responseLetterPdf` is the generated response. Everything after it is an
 * attachment the user explicitly chose to enclose.
 *
 * `readBytes` is injectable so the assembly rules can be exercised against
 * real PDFs -- in production tests without a storage backend, and in the
 * Studio workflow acceptance engine against fixture uploads -- without any
 * test-only reimplementation of the merge itself.
 */
export async function assemblePacket(
  responseLetterPdf: Uint8Array,
  documents: PacketDocumentRow[],
  readBytes: DocumentByteReader,
  options: { excludedResponsePages?: readonly number[] } = {},
): Promise<AssembledPacket> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const packet = await PDFDocument.create();
  packet.setCreationDate(new Date(0));
  packet.setModificationDate(new Date(0));

  const response = await PDFDocument.load(responseLetterPdf, {
    ignoreEncryption: false,
    throwOnInvalidObject: true,
    updateMetadata: false,
  }).catch(() => {
    throw new PacketError("The generated response letter is not a readable PDF");
  });
  const excludedResponsePages = new Set(options.excludedResponsePages ?? []);
  const responseIndices = response.getPageIndices().filter((i) => !excludedResponsePages.has(i));
  if (responseIndices.length < 1) throw new PacketError("The generated response letter has no pages left after removing pages in the preview");
  const responsePageRefs = await packet.copyPages(response, responseIndices);
  for (const page of responsePageRefs) packet.addPage(page);
  const responsePages = responsePageRefs.length;
  if (responsePages < 1) throw new PacketError("The generated response letter has no pages");

  const manifest: PacketManifestEntry[] = [];
  // Where each enclosure starts, so a reviewer (or the IRS clerk who opens
  // this) can tell which pages are the letter and which are which enclosure
  // if the packet gets separated from its envelope.
  const enclosureStarts: Array<{ pageIndex: number; label: string }> = [];
  let supportingPages = 0;

  for (const row of documents) {
    const bytes = await readBytes(row);

    // The vault recorded this hash at intake. A mismatch means the stored bytes
    // are not the ones the user uploaded, so the packet must not be built.
    if (computeSha256(bytes) !== row.sha256) {
      throw new PacketError(`${row.safe_filename} failed its integrity check`);
    }

    const startPageIndex = packet.getPageCount();
    let pageCount: number;

    if (row.mime_type === "application/pdf") {
      pageCount = await appendPdf(packet, bytes, row);
    } else if (row.mime_type === "image/png" || row.mime_type === "image/jpeg") {
      pageCount = await appendImage(packet, bytes, row);
    } else {
      throw new PacketError(`${row.safe_filename} cannot be enclosed in a mailed packet`);
    }

    supportingPages += pageCount;
    if (responsePages + supportingPages > MAX_PACKET_PAGES) {
      throw new PacketError(`The packet exceeds ${MAX_PACKET_PAGES} pages`);
    }

    enclosureStarts.push({
      pageIndex: startPageIndex,
      label: row.role === "subject_notice" ? "Enclosure: Original Notice" : `Enclosure: ${row.safe_filename}`,
    });

    manifest.push({
      documentId: row.document_id,
      role: row.role,
      evidenceKind: row.evidence_kind,
      filename: row.safe_filename,
      sha256: row.sha256,
      pageCount,
    });
  }

  // Stamp every page "Page N of TOTAL" and label the first page of each
  // enclosure, so pages that get separated can still be reassembled and
  // identified. Kept to a thin footer band well clear of the Lob
  // top_first_page zone and of any full-bleed enclosed image.
  const STAMP_SIZE = 8;
  const STAMP_Y = 18;
  const STAMP_MARGIN = 36;
  const stampFont = await packet.embedFont(StandardFonts.Helvetica);
  const stampColor = rgb(0.35, 0.35, 0.35);
  const pages = packet.getPages();
  const total = pages.length;
  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const label = `Page ${index + 1} of ${total}`;
    const labelWidth = stampFont.widthOfTextAtSize(label, STAMP_SIZE);
    page.drawText(label, {
      x: width - STAMP_MARGIN - labelWidth,
      y: STAMP_Y,
      size: STAMP_SIZE,
      font: stampFont,
      color: stampColor,
    });
  });
  for (const { pageIndex, label } of enclosureStarts) {
    const page = pages[pageIndex];
    if (!page) continue;
    page.drawText(label, { x: STAMP_MARGIN, y: STAMP_Y, size: STAMP_SIZE, font: stampFont, color: stampColor });
  }

  const bytes = await packet.save({ useObjectStreams: false });
  return { bytes, sha256: computeSha256(bytes), responsePages, supportingPages, manifest };
}
