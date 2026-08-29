/* ─────────────────────────────────────────────
   Client-side text extraction.
   - Text files: FileReader.readAsText()
   - PDF: dynamically imported pdf.js
   - Images: manual entry fallback (OCR future)

   Upgraded with platform document safety:
   - MIME type validation (never trust client MIME alone)
   - File size limits per type
   - Filename sanitization
   - Content sanitization (prompt injection defense)
   - Page count limits
   ───────────────────────────────────────────── */

import {
  validateFile,
  sanitizeFilename,
  sanitizeExtractedText,
  MAX_PDF_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TEXT_BYTES,
  MAX_PAGES,
  isAllowedMimeType,
  isDangerousMimeType,
} from "@/lib/platform/documents";

export interface ExtractionResult {
  text: string;
  warnings: string[];
  filename: string;
  pageCount: number;
}

export interface ExtractionError {
  error: string;
  filename: string;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const result = await extractTextFromFileSafe(file);
  if ("error" in result) {
    return "";
  }
  return result.text;
}

/* ── Safe extraction with validation and sanitization ── */

export async function extractTextFromFileSafe(
  file: File,
): Promise<ExtractionResult | ExtractionError> {
  const filename = sanitizeFilename(file.name);
  const mimeType = file.type || guessMimeType(filename);
  const size = file.size;

  // Validate file safety
  const validation = validateFile({
    filename,
    mimeType,
    size,
  });

  if (!validation.ok) {
    return {
      error: validation.error.message,
      filename,
    };
  }

  // Extract based on type
  if (mimeType === "text/plain" || filename.endsWith(".txt") || filename.endsWith(".md")) {
    const text = await file.text();
    const { text: cleaned, warnings } = sanitizeExtractedText(text);
    return { text: cleaned, warnings, filename, pageCount: 1 };
  }

  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    try {
      const pdfjs = await import("pdfjs-dist");
      const arrayBuffer = await file.arrayBuffer();

      // Check page count
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageCount = Math.min(pdf.numPages, MAX_PAGES);

      const textParts: string[] = [];
      const allWarnings: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => (item.str ? item.str : ""))
          .join(" ");
        textParts.push(pageText);
      }

      const rawText = textParts.join("\n\n");
      const { text: cleanedText, warnings } = sanitizeExtractedText(rawText);
      allWarnings.push(...warnings);

      return { text: cleanedText, warnings: allWarnings, filename, pageCount };
    } catch (err) {
      console.warn("PDF extraction failed:", err);
      return { text: "", warnings: ["PDF extraction failed — manual entry required"], filename, pageCount: 0 };
    }
  }

  // Images — would need OCR
  if (mimeType.startsWith("image/")) {
    return { text: "", warnings: ["Image files require OCR — manual entry needed"], filename, pageCount: 0 };
  }

  return { error: `Unsupported file type: ${mimeType}`, filename };
}

/* Check if a file type is supported for text extraction */
export function isExtractable(file: File): boolean {
  const mimeType = file.type || guessMimeType(file.name);
  return isAllowedMimeType(mimeType);
}

/* Check if a file needs OCR (image-based) */
export function needsOCR(file: File): boolean {
  return file.type.startsWith("image/");
}

/* Validate a file before upload (client-side pre-check) */
export function validateUploadFile(file: File): { valid: boolean; error?: string } {
  const filename = sanitizeFilename(file.name);
  const mimeType = file.type || guessMimeType(filename);
  const validation = validateFile({
    filename,
    mimeType,
    size: file.size,
  });

  if (!validation.ok) {
    return { valid: false, error: validation.error.message };
  }
  return { valid: true };
}

/* ── MIME type guessing from extension (never trust client MIME alone) ── */
function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "tif":
    case "tiff": return "image/tiff";
    case "txt": return "text/plain";
    case "md": return "text/plain";
    default: return "application/octet-stream";
  }
}
