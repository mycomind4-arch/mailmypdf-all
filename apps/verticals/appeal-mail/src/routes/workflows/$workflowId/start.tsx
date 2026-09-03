import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { isWorkflowId } from "@/domain/workflows";
import { isLaunchReadyWorkflow } from "@/domain/appeal-catalog";

export const Route = createFileRoute("/workflows/$workflowId/start")({
  component: WorkflowStart,
});

function WorkflowStart() {
  const { workflowId } = Route.useParams();
  if (!isWorkflowId(workflowId))
    return <Navigate to="/workflows/denied-claim" />;
  if (!isLaunchReadyWorkflow(workflowId)) return <Navigate to="/workflows" />;
  if (workflowId === "ssdi-denial")
    return <Navigate to="/workflows/ssdi-denial" />;
  return <AppealWorkflowWorkspace workflowId={workflowId} />;
}
