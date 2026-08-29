import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { draftAppeal } from "@/products/benefits-appeal/claude";

const Input = z.object({
  benefitType: z.string().min(1).max(200),
  agencyName: z.string().min(1).max(300),
  agencyAddress: z.string().max(500).default(""),
  caseNumber: z.string().max(200).default(""),
  denialDate: z.string().max(50).default(""),
  appealDeadline: z.string().max(50).default(""),
  denialReason: z.string().min(1).max(5000),
  appellantPosition: z.string().min(1).max(5000),
  evidenceItems: z.string().max(5000).default(""),
  appellantName: z.string().min(1).max(200),
  appellantAddress: z.string().max(500).default(""),
  appellantEmail: z.string().max(200).default(""),
  appellantPhone: z.string().max(50).default(""),
  additionalNotes: z.string().max(5000).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/benefits-appeal/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "benefits-appeal.draft", {
          maxRequests: 20, windowMs: 60_000,
        });
        if (!limiter.allowed)
          return errorResponse(429, "rate_limited", "Too many drafts. Please wait a minute and try again.", "BENEFITS_DRAFT_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try {
          input = Input.parse(await request.json());
        } catch {
          return errorResponse(400, "invalid_input", "The appeal details are incomplete or invalid.", "INVALID_BENEFITS_DRAFT_INPUT");
        }

        try {
          const draft = await draftAppeal(input);
          return Response.json({ product: "benefits-appeal", draft, requiresHumanReview: true });
        } catch (error) {
          console.error("[benefits-appeal] draft failed", error);
          return errorResponse(502, "provider_error", "The appeal letter draft could not be generated. Please try again.", "BENEFITS_DRAFT_FAILED");
        }
      },
    },
  },
});
