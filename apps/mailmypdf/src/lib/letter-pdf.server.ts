// NOTE: pdf-lib is imported dynamically inside functions to prevent the
// Nitro/rollup bundler from hoisting the tslib dependency into the SSR
// chunk, which causes a "Cannot destructure property '__extends'" error on
// Cloudflare Workers.  Do NOT add a top-level import of pdf-lib.

const PAGE_WIDTH = 612; // 8.5" × 72
const PAGE_HEIGHT = 792; // 11" × 72
const MARGIN = 72; // 1"
const FONT_SIZE = 12;
const LINE_HEIGHT = 16;
const MAX_LINES_PER_PAGE = 38;

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
  for (let i = 0; i < allLines.length; i += MAX_LINES_PER_PAGE) {
    pages.push(allLines.slice(i, i + MAX_LINES_PER_PAGE));
  }
  if (pages.length === 0) pages.push([""]);

  for (const pageLines of pages) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

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
  }

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
  const sourceLines = safeText.replace(/\r\n?/g, "\n").split("\n");

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

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

function normalizeForStandardPdfFont(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "*")
    .replace(/\u00A0/g, " ")
    // Standard PDF Times Roman uses WinAnsi. Preserve common Latin names and
    // punctuation while refusing code points the embedded font cannot encode.
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "?");
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
