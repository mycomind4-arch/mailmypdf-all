import { describe, expect, it } from 'vitest'
import { runSmallBusinessGoldWorkflow } from './goldStandardWorkflow'
import { getWorkflow } from './workflows'

const successfulDependencies = () => ({
  evaluateTrigger: async () => ({ passed: true, evidenceIds: ['trigger:event'] }),
  generateDocument: async () => ({ passed: true, evidenceIds: ['document:generated'] }),
  validate: async () => ({ passed: true, evidenceIds: ['validation:check'] }),
  requestApproval: async () => ({ passed: true, evidenceIds: ['approval:actor'] }),
  sendMail: async () => ({ passed: true, evidenceIds: ['mail:submission'] }),
  verifyTracking: async () => ({ passed: true, evidenceIds: ['tracking:number'] }),
  verifyProof: async () => ({ passed: true, evidenceIds: ['proof:receipt'] }),
  archive: async () => ({ passed: true, evidenceIds: ['archive:event'] }),
})

describe('small business gold-standard workflow', () => {
  it('executes every consequential lifecycle gate for an approval workflow', async () => {
    const workflow = getWorkflow('payment-demand')!
    const result = await runSmallBusinessGoldWorkflow(workflow, successfulDependencies())

    expect(result.status).toBe('completed')
    expect(result.stages.map(stage => stage.stage)).toEqual([
      'trigger', 'document', 'validation', 'approval', 'mailing', 'tracking', 'proof', 'archive',
    ])
    expect(result.stages.every(stage => stage.evidenceIds.length > 0)).toBe(true)
  })

  it('does not invent approval for workflows that do not require it', async () => {
    const workflow = getWorkflow('payment-reminder')!
    const result = await runSmallBusinessGoldWorkflow(workflow, successfulDependencies())

    expect(result.status).toBe('completed')
    expect(result.stages.some(stage => stage.stage === 'approval')).toBe(false)
  })

  it('blocks before mailing when validation fails', async () => {
    const workflow = getWorkflow('payment-demand')!
    const dependencies = successfulDependencies()
    dependencies.validate = async () => ({ passed: false, evidenceIds: [], message: 'validation gate did not pass' })

    const result = await runSmallBusinessGoldWorkflow(workflow, dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)).toEqual({
      stage: 'validation',
      status: 'blocked',
      evidenceIds: [],
      messages: ['validation gate did not pass'],
    })
    expect(result.stages.some(stage => stage.stage === 'mailing')).toBe(false)
  })

  it('blocks approval workflows when approval is denied', async () => {
    const workflow = getWorkflow('contract-renewal')!
    const dependencies = successfulDependencies()
    dependencies.requestApproval = async () => ({ passed: false, evidenceIds: [], message: 'approval denied' })

    const result = await runSmallBusinessGoldWorkflow(workflow, dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('approval')
    expect(result.stages.some(stage => stage.stage === 'mailing')).toBe(false)
  })

  it('requires real tracking and proof before completion', async () => {
    const workflow = getWorkflow('payment-reminder')!
    const dependencies = successfulDependencies()
    dependencies.verifyProof = async () => ({ passed: false, evidenceIds: [], message: 'proof unavailable' })

    const result = await runSmallBusinessGoldWorkflow(workflow, dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('proof')
    expect(result.stages.some(stage => stage.stage === 'archive')).toBe(false)
  })

  it('blocks a successful-looking stage with no provenance', async () => {
    const workflow = getWorkflow('payment-reminder')!
    const dependencies = successfulDependencies()
    dependencies.validate = async () => ({ passed: true, evidenceIds: [], message: 'no validation provenance' })

    const result = await runSmallBusinessGoldWorkflow(workflow, dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('validation')
    expect(result.stages.at(-1)?.status).toBe('blocked')
  })
})
