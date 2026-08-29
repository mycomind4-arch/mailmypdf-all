import type { SmallBusinessWorkflowDefinition } from './workflows'

export type DomainCapability =
  | 'classification'
  | 'extraction'
  | 'deadlines'
  | 'evidence'
  | 'strategy'
  | 'draft'
  | 'validation'
  | 'approval'
  | 'mailing'
  | 'tracking'
  | 'proofAudit'

export type WorkflowCertification = {
  workflowId: string
  declaredCapabilities: DomainCapability[]
  missingCapabilities: DomainCapability[]
  blockingReasons: string[]
  executable: boolean
}

const requiredByWorkflow: Record<SmallBusinessWorkflowDefinition['id'], DomainCapability[]> = {
  'payment-reminder': ['classification', 'extraction', 'validation', 'mailing', 'tracking', 'proofAudit'],
  'payment-demand': ['classification', 'extraction', 'evidence', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit'],
  'contract-renewal': ['classification', 'extraction', 'deadlines', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit'],
  'compliance-notice': ['classification', 'extraction', 'deadlines', 'evidence', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit'],
  'customer-dispute-response': ['classification', 'extraction', 'evidence', 'strategy', 'draft', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit'],
}

export function certifyWorkflowCapability(
  workflow: SmallBusinessWorkflowDefinition,
  available: readonly DomainCapability[],
): WorkflowCertification {
  const declaredCapabilities = requiredByWorkflow[workflow.id]
  const missingCapabilities = declaredCapabilities.filter(capability => !available.includes(capability))
  const blockingReasons: string[] = []

  const approvalIndex = workflow.actions.findIndex(action => action.type === 'require_approval')
  const sendIndex = workflow.actions.findIndex(action => action.type === 'send_mail')

  if (workflow.requiresApproval) {
    if (approvalIndex === -1) {
      blockingReasons.push('Workflow requires approval but declares no require_approval action.')
    } else if (sendIndex === -1) {
      blockingReasons.push('Workflow requires approval but declares no send_mail action.')
    } else if (approvalIndex > sendIndex) {
      blockingReasons.push('Approval action must occur before send_mail.')
    }
  }

  if (!workflow.requiresApproval && workflow.risk === 'CRITICAL') {
    blockingReasons.push('Critical-risk workflow must require explicit approval.')
  }

  if (sendIndex === -1) {
    blockingReasons.push('Executable mailing workflow must declare send_mail.')
  }

  return {
    workflowId: workflow.id,
    declaredCapabilities,
    missingCapabilities,
    blockingReasons,
    executable: missingCapabilities.length === 0 && blockingReasons.length === 0,
  }
}
