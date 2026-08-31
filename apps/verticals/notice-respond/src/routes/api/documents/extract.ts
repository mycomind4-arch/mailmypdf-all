/**
 * POST /api/documents/extract
 *
 * Server-side document extraction using PDF.js.
 * Accepts a file upload, extracts text, returns a normalized ExtractedDocument.
 *
 * This replaces the client-side Latin-1 decode hack.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import {
  validateFilename,
  validateFileSize,
  validateMimeType,
  classifyContent,
  validateTextInput,
} from "@/domain/security";
import { extractDocument } from "@/platform/document-intelligence";

export const Route = createFileRoute("/api/documents/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const form = await request.formData();
          const file = form.get("file") ?? form.get("document");
          if (!(file instanceof File)) {
            return Response.json({ error: "A document file is required." }, { status: 400 });
          }

          // ── Input validation ─────────────────────────────────
          const nameCheck = validateFilename(file.name);
          if (!nameCheck.valid) {
            return Response.json({ error: `Filename validation failed: ${nameCheck.errors.join(", ")}` }, { status: 400 });
          }
          const sizeCheck = validateFileSize(file.size);
          if (!sizeCheck.valid) {
            return Response.json({ error: sizeCheck.error ?? "File size validation failed" }, { status: 413 });
          }
          const mimeCheck = validateMimeType(file.type);
          if (!mimeCheck.valid) {
            return Response.json({ error: mimeCheck.error ?? "File type not allowed" }, { status: 415 });
          }

          // ── Extract document ─────────────────────────────────
          const extracted = await extractDocument(file);

          // ── Security classification on extracted text ─────────
          if (extracted.fullText && extracted.fullText.length > 20) {
            extracted.securityClassification = classifyContent(extracted.fullText);
            // Sanitize the text before returning
            const sanitized = validateTextInput(extracted.fullText);
            extracted.fullText = sanitized.sanitized;
            extracted.pages = extracted.pages.map((p) => ({
              ...p,
              text: validateTextInput(p.text).sanitized,
            }));
          }

          // ── Return normalized document ────────────────────────
          return Response.json({
            ok: true,
            document: {
              documentId: extracted.documentId,
              fileName: extracted.fileName,
              mimeType: extracted.mimeType,
              fileSize: extracted.fileSize,
              pageCount: extracted.pageCount,
              pages: extracted.pages,
              fullText: extracted.fullText,
              extractionMethod: extracted.extractionMethod,
              documentKind: extracted.documentKind,
              extractionConfidence: extracted.extractionConfidence,
              hash: extracted.hash,
              uploadedAt: extracted.uploadedAt,
              securityWarning: extracted.securityClassification?.detectedInjectionPatterns.length
                ? `${extracted.securityClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.`
                : null,
              warnings: extracted.warnings,
            },
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Document extraction failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
