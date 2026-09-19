/**
 * POST /api/v1/appeal-reply/draft-appeal
 *
 * Accepts JSON with the case analysis, verified facts, user grounds,
 * answers to intelligence questions, and sender/recipient address info.
 *
 * Sends to Claude and returns a structured AppealDraft —
 * a complete appeal letter with evidence-linked sections, exhibit list,
 * and warnings about unsupported claims.
 *
 * Follows the same conventions as analyze-file.ts and analyze-case.ts:
 * - Uses the repository's error response format
 * - Validates input with Zod
 * - No proof-of-service API key required (product UI endpoint)
 */

import { createFileRoute } from "@tanstack/react-router";
import { DraftAppealInputSchema } from "@/products/appeal-reply/draft-model";
import { draftAppealWithClaude } from "@/products/appeal-reply/draft-claude";

export const Route = createFileRoute("/api/v1/appeal-reply/draft-appeal")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // ── Validate content type ──────────────────────────────────────────
          const contentType = request.headers.get("content-type") || "";
          if (!contentType.toLowerCase().includes("application/json")) {
            return Response.json(
              {
                error: {
                  type: "unsupported_media_type",
                  message: "draft-appeal accepts JSON only",
                  code: "INVALID_CONTENT_TYPE",
                },
              },
              { status: 415 },
            );
          }

          // ── Parse and validate input ────────────────────────────────────────
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message: "Invalid JSON body",
                  code: "INVALID_JSON",
                },
              },
              { status: 400 },
            );
          }

          let input;
          try {
            input = DraftAppealInputSchema.parse(body);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Validation failed";
            return Response.json(
              {
                error: {
                  type: "validation_error",
                  message,
                  code: "INVALID_INPUT",
                },
              },
              { status: 400 },
            );
          }

          // ── Check Claude is configured ─────────────────────────────────────
          if (!process.env.ANTHROPIC_API_KEY) {
            return Response.json(
              {
                error: {
                  type: "configuration_error",
                  message: "Draft generation requires ANTHROPIC_API_KEY to be configured",
                  code: "AI_NOT_CONFIGURED",
                },
              },
              { status: 503 },
            );
          }

          // ── Generate draft with Claude ────────────────────────────────────
          const draft = await draftAppealWithClaude(input);

          return Response.json({
            product: "appeal-reply",
            provider: "claude",
            draft,
            requires_user_review: true,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return Response.json(
            {
              error: {
                type: "provider_error",
                message,
                code: "DRAFT_GENERATION_FAILED",
              },
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
