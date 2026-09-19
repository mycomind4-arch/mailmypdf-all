/**
 * POST /api/v1/appeal-reply/analyze-case
 *
 * Accepts JSON with the verified decision analysis, user-verified facts,
 * user's grounds for appeal, and optional evidence metadata.
 *
 * Sends to Claude and returns a structured AppealCaseAnalysis —
 * the intelligence layer that identifies issues, strengths, weaknesses,
 * contradictions, missing evidence, questions, potential grounds,
 * and a recommended action plan.
 *
 * Follows the same conventions as analyze-file.ts:
 * - Uses the repository's error response format
 * - Validates input with Zod
 * - No proof-of-service API key required (product UI endpoint)
 */

import { createFileRoute } from "@tanstack/react-router";
import { AnalyzeCaseInputSchema } from "@/products/appeal-reply/case-analysis";
import { analyzeAppealCaseWithClaude } from "@/products/appeal-reply/case-claude";

export const Route = createFileRoute("/api/v1/appeal-reply/analyze-case")({
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
                  message: "analyze-case accepts JSON only",
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
            input = AnalyzeCaseInputSchema.parse(body);
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
                  message: "Case analysis requires ANTHROPIC_API_KEY to be configured",
                  code: "AI_NOT_CONFIGURED",
                },
              },
              { status: 503 },
            );
          }

          // ── Analyze with Claude ────────────────────────────────────────────
          const analysis = await analyzeAppealCaseWithClaude(input);

          return Response.json({
            product: "appeal-reply",
            provider: "claude",
            analysis,
            requires_user_review: true,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return Response.json(
            {
              error: {
                type: "provider_error",
                message,
                code: "CASE_ANALYSIS_FAILED",
              },
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
