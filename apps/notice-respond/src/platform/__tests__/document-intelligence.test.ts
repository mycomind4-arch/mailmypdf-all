/**
 * CP2000 Document Intelligence Tests
 *
 * Tests PDF text extraction, OCR detection, and normalized document representation.
 */

import { describe, it, expect } from "vitest";
import { extractDocument, createSourceRef, type ExtractedDocument } from "../document-intelligence";

// ── Helper: create a mock File ────────────────────────────────

function mockTextFile(text: string, name = "notice.txt"): File {
  return new File([text], name, { type: "text/plain" });
}

function mockPdfFile(content: string, name = "notice.pdf"): File {
  // Create a minimal valid PDF structure with text content
  // This won't be a real PDF but will test the PDF path detection
  const buffer = new TextEncoder().encode(content);
  return new File([buffer], name, { type: "application/pdf" });
}

function mockImageFile(name = "scan.jpg"): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], name, { type: "image/jpeg" });
}

// ── Tests ─────────────────────────────────────────────────────

describe("Document Intelligence", () => {
  describe("extractDocument — text files", () => {
    it("extracts text from a plain text file", async () => {
      const text = "CP2000 Notice\nTax Year 2024\nNotice Date: January 15, 2025\nResponse deadline: February 14, 2025";
      const file = mockTextFile(text);
      const doc = await extractDocument(file);

      expect(doc.documentKind).toBe("text");
      expect(doc.extractionMethod).toBe("text_plain");
      expect(doc.extractionConfidence).toBe(1.0);
      expect(doc.fullText).toBe(text);
      expect(doc.pageCount).toBe(1);
      expect(doc.pages[0].text).toBe(text);
      expect(doc.hash).toBeTruthy();
      expect(doc.documentId).toBeTruthy();
    });

    it("handles empty text file", async () => {
      const file = mockTextFile("");
      const doc = await extractDocument(file);

      expect(doc.documentKind).toBe("empty");
      expect(doc.extractionMethod).toBe("empty");
      expect(doc.fullText).toBe("");
      expect(doc.warnings.length).toBeGreaterThan(0);
    });

    it("handles whitespace-only text file", async () => {
      const file = mockTextFile("   \n   \n  ");
      const doc = await extractDocument(file);

      expect(doc.documentKind).toBe("empty");
      expect(doc.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("extractDocument — image files", () => {
    it("detects image files as OCR_REQUIRED", async () => {
      const file = mockImageFile();
      const doc = await extractDocument(file);

      expect(doc.documentKind).toBe("image");
      expect(doc.extractionMethod).toBe("ocr_required");
      expect(doc.extractionConfidence).toBe(0);
      expect(doc.fullText).toBe("");
      expect(doc.warnings[0]).toContain("could not reliably extract text");
    });
  });

  describe("extractDocument — PDF files", () => {
    it("handles invalid PDF gracefully", async () => {
      const file = mockPdfFile("This is not a real PDF");
      const doc = await extractDocument(file);

      // Should not crash — should return error state
      expect(doc.documentKind).toBe("invalid");
      expect(doc.extractionConfidence).toBe(0);
      expect(doc.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("extractDocument — empty files", () => {
    it("detects empty file", async () => {
      const file = new File([""], "empty.txt", { type: "text/plain" });
      const doc = await extractDocument(file);

      expect(doc.documentKind).toBe("empty");
      expect(doc.extractionMethod).toBe("empty");
      expect(doc.pageCount).toBe(0);
    });
  });

  describe("extractDocument — security", () => {
    it("includes security classification when provided", async () => {
      const text = "CP2000 notice text for testing";
      const file = mockTextFile(text);
      const securityClass = {
        detectedInjectionPatterns: ["ignore previous instructions"],
        isLikelyInjection: false,
        sanitized: text,
      };
      const doc = await extractDocument(file, securityClass as any);

      expect(doc.securityClassification).toBeDefined();
    });
  });

  describe("createSourceRef", () => {
    it("creates source reference with page number", () => {
      const doc: ExtractedDocument = {
        documentId: "test",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        fileSize: 1000,
        pageCount: 3,
        pages: [
          { pageNumber: 1, text: "CP2000 Notice on page 1" },
          { pageNumber: 2, text: "Tax year 2024 on page 2" },
          { pageNumber: 3, text: "Response deadline on page 3" },
        ],
        fullText: "CP2000 Notice on page 1\n\nTax year 2024 on page 2\n\nResponse deadline on page 3",
        extractionMethod: "pdf_text",
        documentKind: "text_pdf",
        extractionConfidence: 0.95,
        hash: "abc123",
        uploadedAt: new Date().toISOString(),
        warnings: [],
      };

      const ref = createSourceRef(doc, "Tax year 2024", 2);
      expect(ref.page).toBe(2);
      expect(ref.excerpt).toContain("Tax year 2024");
      expect(ref.extractionMethod).toBe("pdf_text");
      expect(ref.confidence).toBe(0.95);
    });

    it("auto-detects page from excerpt", () => {
      const doc: ExtractedDocument = {
        documentId: "test",
        fileName: "test.pdf",
        mimeType: "application/pdf",
        fileSize: 1000,
        pageCount: 2,
        pages: [
          { pageNumber: 1, text: "First page content" },
          { pageNumber: 2, text: "Found the target text here" },
        ],
        fullText: "First page content\n\nFound the target text here",
        extractionMethod: "pdf_text",
        documentKind: "text_pdf",
        extractionConfidence: 0.95,
        hash: "abc123",
        uploadedAt: new Date().toISOString(),
        warnings: [],
      };

      const ref = createSourceRef(doc, "Found the target text here");
      expect(ref.page).toBe(2);
    });
  });
});
