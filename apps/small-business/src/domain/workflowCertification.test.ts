import { describe, expect, it } from 'vitest'
import { certifyWorkflowCapability } from './workflowCertification'
import { getWorkflow } from './workflows'

describe('small business workflow capability certification', () => {
  it('marks a workflow executable only when every declared capability exists and approval precedes send', () => {
    const workflow = getWorkflow('contract-renewal')!
    const result = certifyWorkflowCapability(workflow, [
      'classification', 'extraction', 'deadlines', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit',
    ])

    expect(result.executable).toBe(true)
    expect(result.missingCapabilities).toEqual([])
    expect(result.blockingReasons).toEqual([])
  })

  it('keeps incomplete workflows explicitly non-executable', () => {
    const workflow = getWorkflow('customer-dispute-response')!
    const result = certifyWorkflowCapability(workflow, [
      'classification', 'extraction', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit',
    ])

    expect(result.executable).toBe(false)
    expect(result.missingCapabilities).toEqual(['evidence', 'strategy', 'draft'])
  })

  it('blocks a high-risk workflow with approval declared after mailing', () => {
    const workflow = {
      ...getWorkflow('payment-demand')!,
      actions: [
        { type: 'generate_document', templateId: 'payment-demand' },
        { type: 'send_mail', mailClass: 'certified' },
        { type: 'require_approval', approverRole: 'owner' },
      ],
    } as typeof getWorkflow extends (...args: any[]) => infer R ? NonNullable<R> : never

    const result = certifyWorkflowCapability(workflow, [
      'classification', 'extraction', 'evidence', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit',
    ])

    expect(result.executable).toBe(false)
    expect(result.blockingReasons).toContain('Approval action must occur before send_mail.')
  })

  it('blocks a required-approval workflow when the approval action is missing', () => {
    const workflow = {
      ...getWorkflow('payment-demand')!,
      actions: [
        { type: 'generate_document', templateId: 'payment-demand' },
        { type: 'send_mail', mailClass: 'certified' },
      ],
    } as typeof getWorkflow extends (...args: any[]) => infer R ? NonNullable<R> : never

    const result = certifyWorkflowCapability(workflow, [
      'classification', 'extraction', 'evidence', 'validation', 'approval', 'mailing', 'tracking', 'proofAudit',
    ])

    expect(result.executable).toBe(false)
    expect(result.blockingReasons).toContain('Workflow requires approval but declares no require_approval action.')
  })
})
