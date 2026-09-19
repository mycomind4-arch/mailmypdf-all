/**
 * DisputeMail API — Draft
 *
 * POST /api/v1/dispute-mail/draft
 *
 * Generates a dispute letter draft from user-provided intake data and
 * optionally confirmed extracted facts.
 *
 * Uses the canonical AI workflow infrastructure.
 * Rate-limited to prevent AI abuse.
 * The draft is NOT final — the user must review and edit it.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createVerticalAIWorkflow } from "@/lib/ai-workflow";
import "@/verticals/dispute-mail";
import type { DisputeIntake, DisputeFacts } from "@/verticals/dispute-mail/types";

export const Route = createFileRoute("/api/v1/dispute-mail/draft")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Rate limit: 10 drafts per hour per IP
          const ip = getClientIp(request);
          const rl = rateLimit(ip, "dispute-mail-draft", {
            maxRequests: 10,
            windowMs: 3_600_000,
          });
          if (!rl.allowed) {
            return Response.json(
              { error: "Too many draft requests. Please try again later." },
              { status: 429 },
            );
          }

          const body = await request.json();
          const { intake, facts, factsConfirmed, userInstructions } = body as {
            intake: DisputeIntake;
            facts?: DisputeFacts;
            factsConfirmed?: boolean;
            userInstructions?: string;
          };

          // Validate intake
          if (!intake || !intake.recipientName || !intake.disputeSubject) {
            return Response.json(
              { error: "Recipient name and dispute subject are required." },
              { status: 400 },
            );
          }

          if (!intake.whatHappened || intake.whatHappened.trim().length < 10) {
            return Response.json(
              { error: "Please describe what happened (at least a sentence)." },
              { status: 400 },
            );
          }

          if (intake.whatHappened.length > 10_000) {
            return Response.json(
              { error: "Description is too long (max 10,000 characters)." },
              { status: 413 },
            );
          }

          const ai = createVerticalAIWorkflow("dispute-mail");
          const draftResult = await ai.generateDraft({
            facts: {
              intake,
              facts: factsConfirmed ? facts : undefined,
              userInstructions,
            },
            userInstructions,
          });

          // Check for inferences — if facts were provided but not confirmed,
          // note that the draft may contain unverified information
          const hasInferences = !!facts && !factsConfirmed;

          return Response.json({
            letterText: draftResult.content,
            pageCount: draftResult.pageCount,
            hasInferences,
            warnings: hasInferences
              ? ["This draft may contain unverified information from document analysis. Please review carefully before sending."]
              : ["Please review your letter carefully before sending. DisputeMail does not provide legal advice."],
          });
        } catch (e: any) {
          return Response.json(
            { error: e?.message || "Draft generation failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
