import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { SsiDenialWorkspace } from "@/components/workflow/ssi-denial-workspace";
import { isWorkflowId } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/$workflowId/start")({
  component: WorkflowStart,
});

function WorkflowStart() {
  const { workflowId } = Route.useParams();
  if (!isWorkflowId(workflowId)) return <Navigate to="/workflows/denied-claim" />;
  if (workflowId === "ssi-denial") return <SsiDenialWorkspace />;
  return <AppealWorkflowWorkspace workflowId={workflowId} />;
}
