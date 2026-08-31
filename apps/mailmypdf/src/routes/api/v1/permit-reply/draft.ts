import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { draftPermitResponse } from "@/products/permit-reply/claude";

const Input = z.object({
  noticeType: z.string().min(1).max(200),
  agencyName: z.string().min(1).max(300),
  agencyAddress: z.string().max(500).default(""),
  permitNumber: z.string().max(200).default(""),
  noticeDate: z.string().max(50).default(""),
  responseDeadline: z.string().max(50).default(""),
  noticeSummary: z.string().min(1).max(5000),
  applicantPosition: z.string().min(1).max(5000),
  evidenceItems: z.string().max(5000).default(""),
  propertyAddress: z.string().max(500).default(""),
  projectDescription: z.string().max(2000).default(""),
  applicantName: z.string().min(1).max(200),
  applicantAddress: z.string().max(500).default(""),
  applicantEmail: z.string().max(200).default(""),
  applicantPhone: z.string().max(50).default(""),
  additionalNotes: z.string().max(5000).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/permit-reply/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "permit-reply.draft", {
          maxRequests: 20, windowMs: 60_000,
        });
        if (!limiter.allowed)
          return errorResponse(429, "rate_limited", "Too many drafts. Please wait a minute and try again.", "PERMIT_DRAFT_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try {
          input = Input.parse(await request.json());
        } catch {
          return errorResponse(400, "invalid_input", "The notice details are incomplete or invalid.", "INVALID_PERMIT_DRAFT_INPUT");
        }

        try {
          const draft = await draftPermitResponse(input);
          return Response.json({ product: "permit-reply", draft, requiresHumanReview: true });
        } catch (error) {
          console.error("[permit-reply] draft failed", error);
          return errorResponse(502, "provider_error", "The response letter draft could not be generated. Please try again.", "PERMIT_DRAFT_FAILED");
        }
      },
    },
  },
});
