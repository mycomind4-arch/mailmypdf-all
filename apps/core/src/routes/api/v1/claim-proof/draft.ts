import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { draftCoverLetter } from "@/products/claim-proof/claude";

const Input = z.object({
  claimType: z.string().min(1).max(200),
  recipientName: z.string().min(1).max(300),
  recipientAddress: z.string().max(500).default(""),
  claimNumber: z.string().max(200).default(""),
  claimDate: z.string().max(50).default(""),
  claimAmount: z.string().max(200).default(""),
  claimSummary: z.string().min(1).max(5000),
  evidenceItems: z.string().max(5000).default(""),
  deadline: z.string().max(50).default(""),
  claimantName: z.string().min(1).max(200),
  claimantAddress: z.string().max(500).default(""),
  claimantEmail: z.string().max(200).default(""),
  claimantPhone: z.string().max(50).default(""),
  additionalNotes: z.string().max(5000).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/claim-proof/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "claim-proof.draft", {
          maxRequests: 20,
          windowMs: 60_000,
        });
        if (!limiter.allowed)
          return errorResponse(429, "rate_limited", "Too many drafts. Please wait a minute and try again.", "CLAIM_DRAFT_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try {
          input = Input.parse(await request.json());
        } catch {
          return errorResponse(400, "invalid_input", "The claim details are incomplete or invalid.", "INVALID_CLAIM_DRAFT_INPUT");
        }

        try {
          const draft = await draftCoverLetter(input);
          return Response.json({ product: "claim-proof", draft, requiresHumanReview: true });
        } catch (error) {
          console.error("[claim-proof] draft failed", error);
          return errorResponse(502, "provider_error", "The cover letter draft could not be generated. Please try again.", "CLAIM_DRAFT_FAILED");
        }
      },
    },
  },
});
