import type { RiskLevel } from '../platform/vertical-manifest'
import { evaluateWorkflowPolicy } from '../platform/workflow-policy'
import { getWorkflow, type SmallBusinessWorkflowId } from '../domain/workflows'

export interface WorkflowExecutionInput {
  workflowId: SmallBusinessWorkflowId
  recipientId?: string
  documentId?: string
  evidenceCount?: number
}

export interface WorkflowExecutionPlan {
  workflowId: SmallBusinessWorkflowId
  status: 'READY' | 'APPROVAL_REQUIRED' | 'BLOCKED'
  risk: RiskLevel
  reasons: string[]
  actions: readonly { type: string; [key: string]: unknown }[]
}

export function planWorkflowExecution(input: WorkflowExecutionInput): WorkflowExecutionPlan {
  const workflow = getWorkflow(input.workflowId)
  if (!workflow) throw new Error(`Unknown workflow: ${input.workflowId}`)
  const policy = evaluateWorkflowPolicy({
    risk: workflow.risk,
    requiresApproval: workflow.requiresApproval,
    hasEvidence: (input.evidenceCount ?? 0) > 0,
    hasRecipient: Boolean(input.recipientId),
    hasDocument: Boolean(input.documentId),
  })
  return {
    workflowId: workflow.id,
    status: !policy.allowed ? 'BLOCKED' : policy.requiresApproval ? 'APPROVAL_REQUIRED' : 'READY',
    risk: workflow.risk,
    reasons: policy.reasons,
    actions: workflow.actions,
  }
}
