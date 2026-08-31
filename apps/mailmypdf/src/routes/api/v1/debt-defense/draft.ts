import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { draftDebtDefenseLetter } from "@/products/debt-defense/claude";

const Input = z.object({
  responseType: z.string().min(1).max(200),
  collectorName: z.string().min(1).max(300),
  collectorAddress: z.string().max(500).default(""),
  accountReference: z.string().max(200).default(""),
  originalCreditor: z.string().max(300).default(""),
  claimedAmount: z.string().max(100).default(""),
  firstContactDate: z.string().max(50).default(""),
  consumerName: z.string().min(1).max(200),
  consumerAddress: z.string().max(500).default(""),
  consumerEmail: z.string().max(200).default(""),
  consumerPhone: z.string().max(50).default(""),
  disputeReason: z.string().max(3000).default(""),
  additionalNotes: z.string().max(3000).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/debt-defense/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "debt-defense.draft", {
          maxRequests: 20,
          windowMs: 60_000,
        });
        if (!limiter.allowed)
          return errorResponse(429, "rate_limited", "Too many drafts. Please wait a minute and try again.", "DEBT_DRAFT_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try {
          input = Input.parse(await request.json());
        } catch {
          return errorResponse(400, "invalid_input", "The debt situation details are incomplete or invalid.", "INVALID_DEBT_DRAFT_INPUT");
        }

        try {
          const draft = await draftDebtDefenseLetter(input);
          return Response.json({ product: "debt-defense", draft, requiresHumanReview: true });
        } catch (error) {
          console.error("[debt-defense] draft failed", error);
          return errorResponse(502, "provider_error", "The letter could not be generated. Please try again.", "DEBT_DRAFT_FAILED");
        }
      },
    },
  },
});
