import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorResponse } from "@/lib/proof-of-service/api-helpers";
import { getRecordsRequestWorkflow } from "@/products/records-request/workflows";

const Input = z.object({
  workflowId: z.string().min(1),
  requesterName: z.string().min(1),
  agencyName: z.string().min(1),
  recordsDescription: z.string().min(1),
  timeFrame: z.string().default(""),
  draft: z.string().min(20),
  validationValid: z.boolean(),
  validationIssues: z.array(z.string()).default([]),
});

export const Route = createFileRoute("/api/v1/records-request/readiness")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof Input>;
        try { input = Input.parse(await request.json()); } catch { return errorResponse(400, "invalid_input", "Readiness input is incomplete or invalid.", "INVALID_RECORDS_READINESS_INPUT"); }
        const workflow = getRecordsRequestWorkflow(input.workflowId);
        if (!workflow) return errorResponse(404, "workflow_not_found", "Unknown records request workflow.", "RECORDS_WORKFLOW_NOT_FOUND");

        const checks = [
          { label: "Workflow selected", passed: Boolean(workflow) },
          { label: "Requester identified", passed: input.requesterName.trim().length > 1 },
          { label: "Agency/custodian identified", passed: input.agencyName.trim().length > 1 },
          { label: "Records scope specified", passed: input.recordsDescription.trim().length >= 20 },
          { label: "Time frame bounded", passed: input.timeFrame.trim().length > 0 },
          { label: "Draft is substantive", passed: input.draft.trim().length >= 300 },
          { label: "Deterministic validation passed", passed: input.validationValid && input.validationIssues.length === 0 },
        ];
        const failed = checks.filter((check) => !check.passed);
        const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
        const approved = score >= 85 && failed.length === 0;

        return Response.json({
          product: "records-request",
          workflow,
          score,
          approved,
          status: approved ? "ready_for_human_approval" : "blocked",
          checks,
          issues: failed.map((check) => check.label),
          nextStep: approved ? "human_review_and_mail" : "fix_request_before_mailing",
          message: approved ? "The request is structurally ready for human review before mailing." : "Do not mail yet. Resolve the failed readiness checks first.",
        });
      },
    },
  },
});
