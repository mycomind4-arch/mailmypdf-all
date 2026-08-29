import { describe, it, expect } from 'vitest'
import { planWorkflowExecution } from './workflow-engine'

describe('Workflow Engine', () => {
  it('payment reminder can be ready with recipient and document', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-reminder', recipientId: 'r1', documentId: 'd1' })
    expect(plan.status).toBe('READY')
  })

  it('high-risk payment demand is blocked without evidence', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-demand', recipientId: 'r1', documentId: 'd1' })
    expect(plan.status).toBe('BLOCKED')
    expect(plan.reasons.join(' ')).toMatch(/evidence/)
  })

  it('high-risk payment demand requires approval with evidence', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-demand', recipientId: 'r1', documentId: 'd1', evidenceCount: 2 })
    expect(plan.status).toBe('APPROVAL_REQUIRED')
  })

  it('missing recipient blocks every workflow', () => {
    const plan = planWorkflowExecution({ workflowId: 'payment-reminder', documentId: 'd1' })
    expect(plan.status).toBe('BLOCKED')
  })
})
