import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { analyzeRequest } from "@/products/records-request/claude";
import { getRecordsRequestWorkflow, recordsRequestWorkflowMap } from "@/products/records-request/workflows";

const Input = z.object({
  workflowId: z.string().min(1).max(100).optional(),
  requestType: z.string().min(1).max(200),
  agencyName: z.string().min(1).max(300),
  agencyAddress: z.string().max(500).default(""),
  recordsDescription: z.string().min(1).max(5000),
  timeFrame: z.string().max(200).default(""),
  purpose: z.string().max(2000).default(""),
  feeWaiver: z.string().max(200).default(""),
  expeditedProcessing: z.string().max(200).default(""),
  requesterName: z.string().min(1).max(200),
  requesterOrg: z.string().max(200).default(""),
  contactEmail: z.string().max(200).default(""),
  contactPhone: z.string().max(50).default(""),
  documentText: z.string().max(50000).default(""),
});

export const Route = createFileRoute("/api/v1/records-request/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limiter = rateLimit(getClientIp(request), "records-request.analyze", { maxRequests: 10, windowMs: 60_000 });
        if (!limiter.allowed) return errorResponse(429, "rate_limited", "Too many analyses. Please wait a minute and try again.", "RECORDS_ANALYSIS_RATE_LIMITED");

        let input: z.infer<typeof Input>;
        try { input = Input.parse(await request.json()); } catch { return errorResponse(400, "invalid_input", "The request details are incomplete or invalid.", "INVALID_RECORDS_INPUT"); }

        const selectedWorkflow = input.workflowId ? getRecordsRequestWorkflow(input.workflowId) : Object.values(recordsRequestWorkflowMap).find((item) => item.requestType === input.requestType);
        if (!selectedWorkflow) return errorResponse(404, "workflow_not_found", "Unknown records request workflow.", "RECORDS_WORKFLOW_NOT_FOUND");
        if (input.requestType !== selectedWorkflow.requestType) return errorResponse(400, "workflow_mismatch", "The supplied workflow does not match the request type.", "RECORDS_WORKFLOW_MISMATCH");

        try {
          const analysis = await analyzeRequest({ ...input, workflowId: selectedWorkflow.id }, selectedWorkflow);
          return Response.json({ product: "records-request", workflow: selectedWorkflow, analysis });
        } catch (error) {
          console.error("[records-request] analysis failed", error);
          return errorResponse(502, "provider_error", "The request could not be analyzed. Please try again.", "RECORDS_ANALYSIS_FAILED");
        }
      },
    },
  },
});
