import {
  runProfiledWorkflow,
  type WorkflowConsequentialState,
  type WorkflowExecutionInput,
  type WorkflowExecutionResult,
} from "./workflow-executor";
import type { WorkflowId } from "./workflows";

export interface PrivateOfficeWorkflowRequest
  extends Omit<WorkflowExecutionInput, "workflowId"> {
  workflowId: WorkflowId;
  consequential?: WorkflowConsequentialState | null;
}

/**
 * Canonical Private Office workflow entry point.
 * Every problem-specific workflow is dispatched through the same Gold Standard engine;
 * specialized domain analyzers remain internal extensions rather than alternate runtimes.
 */
export function runPrivateOfficeWorkflow(
  request: PrivateOfficeWorkflowRequest,
): WorkflowExecutionResult {
  return runProfiledWorkflow(request, request.consequential);
}
