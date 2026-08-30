/**
 * @mailmypdf/document-intelligence
 *
 * Shared document extraction using PDF.js.
 * Used by all verticals in the MailMyPDF ecosystem.
 *
 * Architecture:
 *   Raw File → extractDocument() → ExtractedDocument → Domain-specific extractor
 *
 * Document content is DATA, never INSTRUCTIONS.
 */

// ── Types ─────────────────────────────────────────────────────

export type ExtractionMethod = "pdf_text" | "text_plain" | "ocr_required" | "empty";
export type DocumentKind = "text_pdf" | "image_only_pdf" | "image" | "text" | "empty" | "invalid";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface SecurityClassification {
  detectedInjectionPatterns: string[];
  isLikelyInjection: boolean;
  sanitized: string;
}

export interface ExtractedDocument {
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  extractionMethod: ExtractionMethod;
  documentKind: DocumentKind;
  extractionConfidence: number;
  hash: string;
  uploadedAt: string;
  securityClassification?: SecurityClassification;
  warnings: string[];
}

// ── Hash ──────────────────────────────────────────────────────

async function sha256(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 0;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    h = ((h << 5) - h + view[i]) | 0;
  }
  return `fallback-${h.toString(16)}`;
}

// ── PDF.js lazy import ────────────────────────────────────────

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      try {
        mod.GlobalWorkerOptions.workerSrc = "";
      } catch {
        // ignore
      }
      return mod;
    });
  }
  return pdfjsPromise;
}

// ── PDF Text Extraction ──────────────────────────────────────

async function extractPdfText(
  buffer: ArrayBuffer,
): Promise<{ pages: ExtractedPage[]; fullText: string; isImageOnly: boolean }> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorker: false,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const pages: ExtractedPage[] = [];
  let fullText = "";
  let totalChars = 0;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const textItems = content.items
      .filter((item): item is { str: string; transform: number[]; hasEOL?: boolean } =>
        "str" in item && typeof (item as { str: unknown }).str === "string",
      )
      .map((item) => ({
        str: item.str,
        hasEOL: item.hasEOL ?? false,
      }));

    let pageText = "";
    for (const item of textItems) {
      pageText += item.str;
      if (item.hasEOL) {
        pageText += "\n";
      }
    }

    if (pageText.trim().length === 0) {
      pageText = content.items
        .map((item) => ("str" in item ? String((item as { str: string }).str) : ""))
        .join(" ")
        .trim();
    }

    pages.push({ pageNumber: i, text: pageText });
    fullText += pageText + "\n\n";
    totalChars += pageText.trim().length;
  }

  const isImageOnly = totalChars < 10;

  try {
    await doc.destroy();
  } catch {
    // ignore
  }

  return { pages, fullText: fullText.trim(), isImageOnly };
}

// ── Main Extraction Entry Point ──────────────────────────────

export async function extractDocument(
  file: File,
  securityClassification?: SecurityClassification,
): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const hash = await sha256(buffer);
  const uploadedAt = new Date().toISOString();
  const warnings: string[] = [];

  if (file.size === 0) {
    return {
      documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: 0,
      pageCount: 0, pages: [], fullText: "", extractionMethod: "empty", documentKind: "empty",
      extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings: ["Document is empty."],
    };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const { pages, fullText, isImageOnly } = await extractPdfText(buffer);
      if (isImageOnly) {
        warnings.push("We could not reliably extract text from this document. It appears to be a scanned image. Please provide a text-based PDF or use OCR processing.");
        return {
          documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
          pageCount: pages.length, pages, fullText: "", extractionMethod: "ocr_required",
          documentKind: "image_only_pdf", extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings,
        };
      }
      return {
        documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
        pageCount: pages.length, pages, fullText, extractionMethod: "pdf_text", documentKind: "text_pdf",
        extractionConfidence: 0.95, hash, uploadedAt, securityClassification, warnings,
      };
    } catch (err) {
      warnings.push(`PDF parsing failed: ${err instanceof Error ? err.message : "unknown error"}. The file may be corrupted or use an unsupported format.`);
      return {
        documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
        pageCount: 0, pages: [], fullText: "", extractionMethod: "empty", documentKind: "invalid",
        extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings,
      };
    }
  }

  if (file.type.startsWith("image/")) {
    warnings.push("We could not reliably extract text from this image. Please provide a text-based PDF or use OCR processing.");
    return {
      documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
      pageCount: 1, pages: [{ pageNumber: 1, text: "" }], fullText: "", extractionMethod: "ocr_required",
      documentKind: "image", extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings,
    };
  }

  if (file.type.startsWith("text/") || file.type === "application/octet-stream") {
    const text = await file.text();
    if (text.trim().length === 0) {
      warnings.push("The document contains no text.");
      return {
        documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
        pageCount: 1, pages: [{ pageNumber: 1, text: "" }], fullText: "", extractionMethod: "empty",
        documentKind: "empty", extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings,
      };
    }
    return {
      documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
      pageCount: 1, pages: [{ pageNumber: 1, text }], fullText: text, extractionMethod: "text_plain",
      documentKind: "text", extractionConfidence: 1.0, hash, uploadedAt, securityClassification, warnings,
    };
  }

  warnings.push(`Unsupported file type: ${file.type}. Please upload a PDF, text file, or image.`);
  return {
    documentId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, fileSize: file.size,
    pageCount: 0, pages: [], fullText: "", extractionMethod: "empty", documentKind: "invalid",
    extractionConfidence: 0, hash, uploadedAt, securityClassification, warnings,
  };
}

// ── Source reference ──────────────────────────────────────────

export interface SourceRef {
  page: number | null;
  excerpt: string;
  extractionMethod: ExtractionMethod;
  confidence: number;
}

export function createSourceRef(
  document: ExtractedDocument,
  excerpt: string,
  page?: number,
): SourceRef {
  let foundPage: number | null = page ?? null;
  if (!foundPage && excerpt) {
    for (const p of document.pages) {
      if (p.text.includes(excerpt.substring(0, 50))) {
        foundPage = p.pageNumber;
        break;
      }
    }
  }
  return {
    page: foundPage,
    excerpt: excerpt.substring(0, 200),
    extractionMethod: document.extractionMethod,
    confidence: document.extractionConfidence,
  };
}
