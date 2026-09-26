/** Host compatibility entry point. Never import navigation into the registry. */
export {
  WORKFLOW_REGISTRY, WORKFLOW_REGISTRY_COUNT, canonicalWorkflowId,
  workflowById, workflowByPublicPath, workflowByWorkspacePath, workflowsForSection,
  type WorkflowId, type WorkflowDefinition,
} from "@mailmypdf/workflows/canonical-registry";
