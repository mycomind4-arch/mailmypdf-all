import { createFileRoute } from "@tanstack/react-router";
import { requireInternalServiceKey } from "@/server/internal-auth";
import { runClaudeDisputeWorkflow } from "@/services/claude-workflow-executor";
import { workflows, type WorkflowId } from "@/domain/workflows";

export const Route = createFileRoute("/api/workflows/$workflowId/claude")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        requireInternalServiceKey(request);
        if (!(params.workflowId in workflows)) return Response.json({ error: "Unknown workflow" }, { status: 404 });
        const body = await request.json() as { documentId?: string; text?: string; facts?: Record<string, string | undefined>; objective?: string; evidenceStatuses?: Record<string, "missing" | "requested" | "provided" | "verified" | "rejected" | "not_applicable">; consequential?: { draftValidated: boolean; humanApproved: boolean; recipientComplete: boolean; paymentComplete: boolean; mailingSubmitted: boolean; trackingNumber: string | null; proofReady: boolean } | null };
        if (!body.documentId?.trim() || !body.text?.trim()) return Response.json({ error: "documentId and text are required" }, { status: 400 });
        const result = await runClaudeDisputeWorkflow({ workflowId: params.workflowId as WorkflowId, documentId: body.documentId, text: body.text, facts: body.facts, objective: body.objective, evidenceStatuses: body.evidenceStatuses, consequential: body.consequential });
        return Response.json(result);
      },
    },
  },
});
