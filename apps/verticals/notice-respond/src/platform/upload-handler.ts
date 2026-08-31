/**
 * Shared file upload + extraction handler.
 *
 * All workflow routes use this instead of the broken Latin-1 hack.
 * Calls the server-side /api/documents/extract endpoint which uses PDF.js.
 *
 * Returns the extracted text and metadata, or an error.
 */

import {
  validateFilename,
  validateFileSize,
  validateMimeType,
  classifyContent,
  validateTextInput,
} from "@/domain/security";
import type { ExtractedDocument } from "@mailmypdf/document-intelligence";

export interface UploadResult {
  text: string;
  document: ExtractedDocument | null;
  securityWarning: string | null;
  error: string | null;
  ocrRequired: boolean;
}

export async function handleDocumentUpload(file: File): Promise<UploadResult> {
  // ── Client-side validation ──────────────────────────────
  const nameCheck = validateFilename(file.name);
  if (!nameCheck.valid) {
    return { text: "", document: null, securityWarning: null, error: `File validation failed: ${nameCheck.errors.join(", ")}`, ocrRequired: false };
  }
  const sizeCheck = validateFileSize(file.size);
  if (!sizeCheck.valid) {
    return { text: "", document: null, securityWarning: null, error: sizeCheck.error ?? "File size validation failed", ocrRequired: false };
  }
  const mimeCheck = validateMimeType(file.type);
  if (!mimeCheck.valid) {
    return { text: "", document: null, securityWarning: null, error: mimeCheck.error ?? "File type not allowed", ocrRequired: false };
  }

  // ── Server-side extraction ────────────────────────────────
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/documents/extract", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { text: "", document: null, securityWarning: null, error: payload?.error ?? `Extraction failed (${response.status})`, ocrRequired: false };
    }

    const doc: ExtractedDocument = payload.document;

    // Check if OCR is required
    if (doc.documentKind === "image_only_pdf" || doc.documentKind === "image" || doc.extractionMethod === "ocr_required") {
      return {
        text: "",
        document: doc,
        securityWarning: null,
        error: null,
        ocrRequired: true,
      };
    }

    // Check for empty/invalid
    if (doc.documentKind === "empty" || doc.documentKind === "invalid" || !doc.fullText || doc.fullText.trim().length < 20) {
      return {
        text: "",
        document: doc,
        securityWarning: null,
        error: doc.warnings?.[0] ?? "No text could be extracted from this document.",
        ocrRequired: false,
      };
    }

    // Security classification
    let securityWarning: string | null = null;
    if (payload.securityWarning) {
      securityWarning = payload.securityWarning;
    } else {
      const contentClass = classifyContent(doc.fullText);
      if (contentClass.detectedInjectionPatterns.length > 0) {
        securityWarning = `${contentClass.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.`;
      }
    }

    // Sanitize text
    const sanitized = validateTextInput(doc.fullText);
    const text = sanitized.sanitized;

    return {
      text,
      document: { ...doc, fullText: text },
      securityWarning,
      error: null,
      ocrRequired: false,
    };
  } catch (err) {
    return {
      text: "",
      document: null,
      securityWarning: null,
      error: err instanceof Error ? err.message : "Document extraction failed.",
      ocrRequired: false,
    };
  }
}
