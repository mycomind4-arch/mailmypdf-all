import { runProfiledDisputeWorkflow, type WorkflowConsequentialState, type WorkflowExecutionInput, type WorkflowExecutionResult } from "./workflow-executor";
import type { WorkflowId } from "./workflows";

export interface DisputeWorkflowRequest extends Omit<WorkflowExecutionInput, "workflowId"> {
  workflowId: WorkflowId;
  consequential?: WorkflowConsequentialState | null;
}

/**
 * Canonical Dispute Mail workflow entry point.
 * Every problem-specific workflow is dispatched through the same Gold Standard engine;
 * specialized domain analyzers remain internal extensions rather than alternate runtimes.
 */
export function runDisputeWorkflow(request: DisputeWorkflowRequest): WorkflowExecutionResult {
  return runProfiledDisputeWorkflow(request, request.consequential);
}
