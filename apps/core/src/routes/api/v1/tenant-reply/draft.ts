import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { draftResponse } from "@/products/tenant-reply/claude";

const Input = z.object({
  noticeType: z.string().min(1).max(200),
  landlordName: z.string().min(1).max(300),
  landlordAddress: z.string().max(500).default(""),
  noticeDate: z.string().max(50).default(""),
  responseDeadline: z.string().max(50).default(""),
  noticeSummary: z.string().min(1).max(5000),
  tenantPosition: z.string().min(1).max(5000),
  evidenceItems: z.string().max(5000).default(""),
  leaseStartDate: z.string().max(50).default(""),
  leaseEndDate: z.string().max(50).default(""),
  monthlyRent: z.string().max(200).default(""),
  tenantName: z.string().min(1).max(200),
  tenantAddress: z.string().max(500).default(""),
  tenantEmail: z.string().max(200).default(""),
  tenantPhone: z.string().max(50).default(""),
  additionalNotes: z.string().max(5000).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/tenant-reply/draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "tenant-reply.draft", {
          maxRequests: 20,
          windowMs: 60_000,
        });
        if (!limiter.allowed)
          return errorResponse(429, "rate_limited", "Too many drafts. Please wait a minute and try again.", "TENANT_DRAFT_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try {
          input = Input.parse(await request.json());
        } catch {
          return errorResponse(400, "invalid_input", "The notice details are incomplete or invalid.", "INVALID_TENANT_DRAFT_INPUT");
        }

        try {
          const draft = await draftResponse(input);
          return Response.json({ product: "tenant-reply", draft, requiresHumanReview: true });
        } catch (error) {
          console.error("[tenant-reply] draft failed", error);
          return errorResponse(502, "provider_error", "The response letter draft could not be generated. Please try again.", "TENANT_DRAFT_FAILED");
        }
      },
    },
  },
});
