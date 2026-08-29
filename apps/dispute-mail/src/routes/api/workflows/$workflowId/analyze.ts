import { createFileRoute } from "@tanstack/react-router";
import { requireInternalServiceKey } from "@/server/internal-auth";
import { runDisputeWorkflow } from "@/domain/dispute-workflow";
import { workflows, type WorkflowId } from "@/domain/workflows";

export const Route = createFileRoute("/api/workflows/$workflowId/analyze")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        requireInternalServiceKey(request);
        if (!(params.workflowId in workflows)) return Response.json({ error: "Unknown workflow" }, { status: 404 });
        const body = await request.json() as {
          documentId?: string;
          text?: string;
          facts?: Record<string, string | undefined>;
          evidenceStatuses?: Record<string, "missing" | "requested" | "provided" | "verified" | "rejected" | "not_applicable">;
          objective?: string;
        };
        if (!body.documentId?.trim() || !body.text?.trim()) return Response.json({ error: "documentId and text are required" }, { status: 400 });
        const result = runDisputeWorkflow({ workflowId: params.workflowId as WorkflowId, documentId: body.documentId, text: body.text, facts: body.facts, evidenceStatuses: body.evidenceStatuses, objective: body.objective });
        return Response.json(result);
      },
    },
  },
});
