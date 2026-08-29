import { describe, it, expect } from 'vitest'
import { planWorkflowExecution } from './workflow-execution'

describe('Workflow Execution Planning', () => {
  it('ready plan reaches mailing and tracking', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-reminder', hasRecipient: true, hasDocument: true, hasEvidence: false, risk: 'LOW', requiresApproval: false })
    expect(plan.status).toBe('READY')
    expect(plan.stages).toEqual(['PLAN', 'REVIEW', 'MAIL', 'TRACK'])
  })

  it('approval-required plan cannot reach mailing', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-demand', hasRecipient: true, hasDocument: true, hasEvidence: true, risk: 'HIGH', requiresApproval: true })
    expect(plan.status).toBe('APPROVAL_REQUIRED')
    expect(plan.stages.includes('MAIL')).toBe(false)
  })

  it('blocked plan cannot reach mailing', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-demand', hasRecipient: false, hasDocument: false, hasEvidence: false, risk: 'HIGH', requiresApproval: true })
    expect(plan.status).toBe('BLOCKED')
    expect(plan.stages.includes('MAIL')).toBe(false)
  })
})
