/**
 * POST /api/v1/appeal-reply/analyze-file
 *
 * Accepts a raw PDF binary (Content-Type: application/pdf), validates it,
 * and sends it to Claude for structured extraction.
 *
 * Returns an AppealAnalysis JSON payload with confidence-scored fields
 * for the user to verify in the AppealReply UI.
 *
 * This endpoint follows the MailMyPDF platform conventions:
 * - Reuses existing PDF validation (pdf-validation.server.ts) for security
 * - Uses the Anthropic Claude API via the product's analysis provider
 * - No proof-of-service API key required (product UI endpoint, like ai-assist)
 */

import { createFileRoute } from "@tanstack/react-router";
import { validatePdfForMailing, PdfValidationError } from "@/lib/pdf-validation.server";
import { analyzeAppealPdfWithClaude } from "@/products/appeal-reply/claude";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const Route = createFileRoute("/api/v1/appeal-reply/analyze-file")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // ── Validate content type ──────────────────────────────────────────
          const contentType = request.headers.get("content-type") || "";
          if (!contentType.toLowerCase().includes("application/pdf")) {
            return Response.json(
              {
                error: {
                  type: "unsupported_media_type",
                  message: "AppealReply accepts PDF documents only",
                  code: "INVALID_DOCUMENT_TYPE",
                },
              },
              { status: 415 },
            );
          }

          // ── Read and size-check the binary ─────────────────────────────────
          const bytes = new Uint8Array(await request.arrayBuffer());
          if (bytes.length === 0) {
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message: "Empty document",
                  code: "EMPTY_DOCUMENT",
                },
              },
              { status: 400 },
            );
          }
          if (bytes.length > MAX_BYTES) {
            return Response.json(
              {
                error: {
                  type: "payload_too_large",
                  message: `Document must be under ${MAX_BYTES / 1024 / 1024} MB`,
                  code: "DOCUMENT_TOO_LARGE",
                },
              },
              { status: 413 },
            );
          }

          // ── Validate PDF structure (security checks) ───────────────────────
          try {
            await validatePdfForMailing(bytes);
          } catch (err) {
            const message = err instanceof PdfValidationError ? err.message : "PDF validation failed";
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message,
                  code: "PDF_VALIDATION_FAILED",
                },
              },
              { status: 422 },
            );
          }

          // ── Check Claude is configured ─────────────────────────────────────
          if (!process.env.ANTHROPIC_API_KEY) {
            return Response.json(
              {
                error: {
                  type: "configuration_error",
                  message: "Document analysis requires ANTHROPIC_API_KEY to be configured",
                  code: "AI_NOT_CONFIGURED",
                },
              },
              { status: 503 },
            );
          }

          // ── Analyze with Claude ────────────────────────────────────────────
          const analysis = await analyzeAppealPdfWithClaude(bytes);

          return Response.json({
            product: "appeal-reply",
            provider: "claude",
            extraction_method: "claude-document",
            analysis,
            requires_user_verification: true,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return Response.json(
            {
              error: {
                type: "provider_error",
                message,
                code: "APPEAL_FILE_ANALYSIS_FAILED",
              },
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
