import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getRecordsRequestWorkflow } from "@/products/records-request/workflows";

const Input = z.object({
  workflowId: z.string().min(1),
  requesterName: z.string().min(1).max(200),
  agencyName: z.string().min(1).max(300),
  recordsDescription: z.string().min(1).max(5000),
  timeFrame: z.string().max(200).default(""),
  contactEmail: z.string().email().or(z.literal("")),
  agencyAddress: z.string().max(500).default(""),
  draft: z.string().min(20).max(30000),
});

export const Route = createFileRoute("/api/v1/records-request/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof Input>;
        try { input = Input.parse(await request.json()); } catch { return errorResponse(400, "invalid_input", "Validation input is incomplete or invalid.", "INVALID_RECORDS_VALIDATION_INPUT"); }
        const workflow = getRecordsRequestWorkflow(input.workflowId);
        if (!workflow) return errorResponse(404, "workflow_not_found", "Unknown records request workflow.", "RECORDS_WORKFLOW_NOT_FOUND");

        const issues: string[] = [];
        const warnings = [...workflow.reviewWarnings];
        if (input.recordsDescription.trim().length < 20) issues.push("Describe the requested records specifically enough for the custodian to locate them.");
        if (!input.timeFrame.trim()) issues.push("Add a date or time range unless the request genuinely cannot be bounded.");
        if (!input.agencyAddress.trim()) warnings.push("Verify the custodian's current mailing address before sending.");
        if (!input.contactEmail.trim()) warnings.push("Providing an email can make clarification or fee notices easier to receive.");
        if (/\b(guarantee|must release|legally required to provide)\b/i.test(input.draft)) warnings.push("Remove absolute legal claims unless the governing authority has been independently verified.");
        if (!new RegExp(input.requesterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(input.draft)) issues.push("The draft does not appear to identify the requester.");
        if (!/records|documents|information/i.test(input.draft)) issues.push("The draft should clearly identify the records being requested.");

        return Response.json({ product: "records-request", workflow, valid: issues.length === 0, issues, warnings, suggestions: workflow.evidenceChecklist });
      },
    },
  },
});
