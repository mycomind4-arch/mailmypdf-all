import { evaluateWorkflowPolicy, type WorkflowPolicyInput, type WorkflowPolicyResult } from './workflow-policy'

export type ExecutionStage = 'PLAN' | 'GENERATE' | 'REVIEW' | 'MAIL' | 'TRACK'
export type ExecutionStatus = 'BLOCKED' | 'APPROVAL_REQUIRED' | 'READY'

export interface WorkflowExecutionRequest extends WorkflowPolicyInput {
  workflowId: string
  documentId?: string
  generatedText?: string
  mailClass?: 'FIRST_CLASS' | 'CERTIFIED' | 'REGISTERED'
}

export interface WorkflowExecutionPlan {
  workflowId: string
  status: ExecutionStatus
  stages: ExecutionStage[]
  policy: WorkflowPolicyResult
  requiresHumanApproval: boolean
}

export function planWorkflowExecution(request: WorkflowExecutionRequest): WorkflowExecutionPlan {
  const policy = evaluateWorkflowPolicy(request)
  const status: ExecutionStatus = !policy.allowed ? 'BLOCKED' : policy.requiresApproval ? 'APPROVAL_REQUIRED' : 'READY'
  const stages: ExecutionStage[] = ['PLAN']
  if (request.generatedText) stages.push('GENERATE')
  stages.push('REVIEW')
  if (status === 'READY') stages.push('MAIL', 'TRACK')
  return { workflowId: request.workflowId, status, stages, policy, requiresHumanApproval: policy.requiresApproval }
}
