// NOTE: pdf-lib is imported dynamically inside the validation function to
// prevent the Nitro/rollup bundler from hoisting the tslib dependency into
// the SSR chunk, which causes a "Cannot destructure property '__extends'"
// error on Cloudflare Workers.  Do NOT add a top-level import of pdf-lib.

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 10;
const MAX_INDIRECT_OBJECTS = 2_500;
const MAX_PAGE_POINTS = 14_400;
const TRAILER_SCAN_BYTES = 4_096;

const FORBIDDEN_PDF_TOKENS = [
  "/JavaScript",
  "/Launch",
  "/OpenAction",
  "/RichMedia",
  "/EmbeddedFile",
  "/EmbeddedFiles",
  "/SubmitForm",
  "/ImportData",
  "/GoToE",
] as const;

export type ValidatedPdf = {
  pageCount: number;
};

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

function latin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

/**
 * Reports the first structurally unsafe feature in a PDF, or null if there is
 * none. Size is deliberately not checked here: the mailing path and the
 * document vault allow different sizes, so the caller decides.
 *
 * Exported so the malware scanner can apply the same rules. A signature scanner
 * has no opinion about an /OpenAction that launches a file, and this is a
 * document that will later be merged into a packet and mailed.
 */
export function findUnsafePdfFeature(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 16) return "TooSmall";
  if (latin1(bytes.slice(0, 5)) !== "%PDF-") return "MissingHeader";

  const trailer = latin1(bytes.slice(Math.max(0, bytes.byteLength - TRAILER_SCAN_BYTES)));
  if (!trailer.includes("%%EOF")) return "MissingEndOfFile";

  const source = latin1(bytes);
  if (/\/Encrypt\b/.test(source)) return "Encrypted";

  for (const token of FORBIDDEN_PDF_TOKENS) {
    if (source.includes(token)) return `ActiveContent${token.replace("/", ".")}`;
  }

  const indirectObjectCount = source.match(/\b\d+\s+\d+\s+obj\b/g)?.length ?? 0;
  if (indirectObjectCount > MAX_INDIRECT_OBJECTS) return "TooManyObjects";

  return null;
}

function assertStaticPdfStructure(bytes: Uint8Array): void {
  if (bytes.byteLength < 16 || bytes.byteLength > MAX_PDF_BYTES) {
    throw new PdfValidationError("PDF size is outside the supported range.");
  }

  const unsafe = findUnsafePdfFeature(bytes);
  if (unsafe === null) return;
  if (unsafe === "MissingHeader") throw new PdfValidationError("File does not have a valid PDF header.");
  if (unsafe === "MissingEndOfFile") throw new PdfValidationError("PDF is missing its end-of-file marker.");
  if (unsafe === "Encrypted") {
    throw new PdfValidationError("Encrypted or password-protected PDFs are not supported.");
  }
  if (unsafe === "TooManyObjects") throw new PdfValidationError("PDF contains too many internal objects.");
  throw new PdfValidationError("PDF contains active or embedded content that cannot be mailed safely.");
}

export async function validatePdfForMailing(bytes: Uint8Array): Promise<ValidatedPdf> {
  assertStaticPdfStructure(bytes);

  const { PDFDocument } = await import("pdf-lib");

  let document;
  try {
    document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
      capNumbers: true,
    });
  } catch {
    throw new PdfValidationError("PDF is malformed, encrypted, or uses unsupported structures.");
  }

  const pages = document.getPages();
  if (pages.length < 1) {
    throw new PdfValidationError("PDF has no pages.");
  }
  if (pages.length > MAX_PAGES) {
    throw new PdfValidationError(`PDFs longer than ${MAX_PAGES} pages are not supported.`);
  }

  for (const page of pages) {
    const { width, height } = page.getSize();
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      width > MAX_PAGE_POINTS ||
      height > MAX_PAGE_POINTS
    ) {
      throw new PdfValidationError("PDF contains an invalid or excessively large page.");
    }
  }

  return { pageCount: pages.length };
}
