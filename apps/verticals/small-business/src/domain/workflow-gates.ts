import type { SmallBusinessWorkflowId } from './workflows';
import { getWorkflow } from './workflows';
import { planWorkflowExecution } from '../services/workflow-engine';

export type ApprovalState = 'none' | 'pending' | 'approved' | 'rejected';

export function assertWorkflowCanSend(input: { workflowId: SmallBusinessWorkflowId; recipientId?: string; documentId?: string; evidenceCount?: number; approvalState?: ApprovalState }): void {
  const workflow = getWorkflow(input.workflowId);
  if (!workflow) throw new Error(`Unknown workflow: ${input.workflowId}`);
  const plan = planWorkflowExecution(input);
  if (plan.status === 'BLOCKED') throw new Error(`Workflow blocked: ${plan.reasons.join('; ')}`);
  if (plan.status === 'APPROVAL_REQUIRED' && input.approvalState !== 'approved') throw new Error(`Approval required for workflow: ${workflow.name}`);
  if (input.approvalState === 'rejected') throw new Error(`Workflow approval was rejected: ${workflow.name}`);
}
