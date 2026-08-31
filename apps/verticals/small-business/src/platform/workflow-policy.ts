import type { RiskLevel } from './vertical-manifest'

const order: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }

export interface WorkflowPolicyInput {
  risk: RiskLevel
  requiresApproval: boolean
  hasEvidence: boolean
  hasRecipient: boolean
  hasDocument: boolean
}

export interface WorkflowPolicyResult {
  allowed: boolean
  requiresApproval: boolean
  reasons: string[]
}

export function evaluateWorkflowPolicy(input: WorkflowPolicyInput): WorkflowPolicyResult {
  const reasons: string[] = []
  if (!input.hasRecipient) reasons.push('recipient is required')
  if (!input.hasDocument) reasons.push('document is required')
  if (order[input.risk] >= order.HIGH && !input.hasEvidence) reasons.push('high-risk correspondence requires evidence')

  return {
    allowed: reasons.length === 0,
    requiresApproval: input.requiresApproval || order[input.risk] >= order.HIGH,
    reasons,
  }
}
