/**
 * Client-side PDF text extraction using Mozilla PDF.js (pdfjs-dist).
 *
 * Implements the DocumentIntelligenceProvider interface so any vertical
 * app can use it identically to the Docling server-side provider.
 *
 * Use this when:
 * - You need client-side extraction (no server round-trip)
 * - The PDF is text-based (not scanned/image-only)
 * - You want page-by-page text with metadata
 *
 * For scanned PDFs or complex layouts (tables, columns), use DoclingHttpProvider
 * which has server-side OCR + layout analysis.
 */

import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error — bundler handles the ?url import
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import type { PlatformId } from "@mailmypdf/core";
import type { DocumentKind, PageMetadata, SourceRef } from "@mailmypdf/documents";
import type {
  DocumentExtractionRequest,
  DocumentIntelligenceProvider,
  ExtractedDocument,
  ExtractedTable,
} from "./index.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfJsProviderConfig {
  /** Maximum pages to extract (default: 500). */
  readonly maxPages?: number;
}

export class PdfJsProvider implements DocumentIntelligenceProvider {
  readonly name = "pdfjs";

  private readonly maxPages: number;

  constructor(config: PdfJsProviderConfig = {}) {
    this.maxPages = config.maxPages ?? 500;
  }

  async extract(request: DocumentExtractionRequest): Promise<ExtractedDocument> {
    const arrayBuffer = request.content.buffer.slice(
      request.content.byteOffset,
      request.content.byteOffset + request.content.byteLength,
    );

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      disableAutoFetch: false,
      disableStream: false,
    });

    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, this.maxPages);

    const pages: PageMetadata[] = [];
    const sourceRefs: SourceRef[] = [];
    const warnings: string[] = [];
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pageTexts.push(pageText);
      pages.push({
        pageNumber: i,
        text: pageText,
        charCount: pageText.length,
      });

      // Collect source refs from text items with position info
      for (const item of textContent.items) {
        if ("str" in item && item.str.length > 2) {
          sourceRefs.push({
            page: i,
            text: item.str,
            bbox: "transform" in item ? [item.transform[4], item.transform[5], 0, 0] : [0, 0, 0, 0],
          } as SourceRef);
        }
      }
    }

    const text = pageTexts.join("\n\n");
    const isImageOnly = text.trim().length < 20;

    if (isImageOnly) {
      warnings.push("PDF appears to be image-only (scanned). No extractable text found. Use OCR for content extraction.");
    }

    const kind: DocumentKind = isImageOnly ? "image" : "pdf";

    return {
      documentId: request.documentId,
      kind,
      text,
      pages,
      tables: [] as ExtractedTable[],
      sourceRefs,
      warnings,
      metadata: {
        pageCount,
        extractor: "pdfjs",
        isImageOnly,
      },
    };
  }
}

/**
 * Convenience function for browser-based extraction from a File object.
 * Used by vertical apps that need client-side PDF text extraction
 * without setting up the full provider interface.
 */
export async function extractDocumentText(file: File): Promise<{
  text: string;
  pageCount: number;
  isImageOnly: boolean;
  extractor: string;
}> {
  if (file.type === "application/pdf") {
    try {
      const provider = new PdfJsProvider();
      const result = await provider.extract({
        documentId: `upload-${Date.now()}` as PlatformId,
        contentType: file.type,
        content: new Uint8Array(await file.arrayBuffer()),
        filename: file.name,
      });
      return {
        text: result.text,
        pageCount: result.metadata.pageCount as number,
        isImageOnly: result.metadata.isImageOnly as boolean,
        extractor: "pdfjs",
      };
    } catch {
      // Fallback: try raw text extraction
      const buffer = await file.arrayBuffer();
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const matches = raw.match(/[\x20-\x7E]{4,}/g);
      return {
        text: matches ? matches.join(" ") : "",
        pageCount: 0,
        isImageOnly: true,
        extractor: "pdfjs-fallback",
      };
    }
  } else if (file.type.startsWith("image/")) {
    return { text: "", pageCount: 0, isImageOnly: true, extractor: "image" };
  } else if (file.type.startsWith("text/") || file.type === "application/octet-stream") {
    return { text: await file.text(), pageCount: 1, isImageOnly: false, extractor: "text" };
  }
  return { text: "", pageCount: 0, isImageOnly: false, extractor: "unknown" };
}
