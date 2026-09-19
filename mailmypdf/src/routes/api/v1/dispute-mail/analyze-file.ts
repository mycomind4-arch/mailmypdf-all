/**
 * DisputeMail API — Analyze File
 *
 * POST /api/v1/dispute-mail/analyze-file
 *
 * Analyzes an uploaded document (PDF, image) in support of a dispute.
 * Extracts structured facts that the user must confirm before use.
 *
 * Uses the canonical AI workflow infrastructure (createVerticalAIWorkflow).
 * Rate-limited to prevent AI abuse.
 * Does NOT expose Claude API keys.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createVerticalAIWorkflow } from "@/lib/ai-workflow";
import "@/verticals/dispute-mail"; // registers AI config

export const Route = createFileRoute("/api/v1/dispute-mail/analyze-file")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Rate limit: 5 analyses per hour per IP
          const ip = getClientIp(request);
          const rl = rateLimit(ip, "dispute-mail-analyze", {
            maxRequests: 5,
            windowMs: 3_600_000,
          });
          if (!rl.allowed) {
            return Response.json(
              { error: "Too many analysis requests. Please try again later." },
              { status: 429 },
            );
          }

          const body = await request.json();
          const { documentText, context } = body;

          if (!documentText || typeof documentText !== "string") {
            return Response.json(
              { error: "Document text is required." },
              { status: 400 },
            );
          }

          if (documentText.length > 50_000) {
            return Response.json(
              { error: "Document text is too long (max 50,000 characters)." },
              { status: 413 },
            );
          }

          const ai = createVerticalAIWorkflow("dispute-mail");
          const result = await ai.analyze({
            context: {
              documentText,
              ...context,
            },
          });

          return Response.json(result);
        } catch (e: any) {
          return Response.json(
            { error: e?.message || "Document analysis failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
