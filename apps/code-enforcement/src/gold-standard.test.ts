import { describe, expect, it } from 'vitest'
import { runCodeEnforcementGoldWorkflow, type CodeEnforcementGoldDependencies } from './gold-standard'

const allPass = (): CodeEnforcementGoldDependencies => ({
  'secure-ingest': async () => ({ passed: true, evidenceIds: ['ingest:document'] }),
  classify: async () => ({ passed: true, evidenceIds: ['classify:notice'] }),
  extract: async () => ({ passed: true, evidenceIds: ['extract:fact'] }),
  timeline: async () => ({ passed: true, evidenceIds: ['timeline:event'] }),
  evidence: async () => ({ passed: true, evidenceIds: ['evidence:source'] }),
  discrepancies: async () => ({ passed: true, evidenceIds: ['discrepancy:finding'] }),
  strategy: async () => ({ passed: true, evidenceIds: ['strategy:plan'] }),
  draft: async () => ({ passed: true, evidenceIds: ['draft:document'] }),
  validate: async () => ({ passed: true, evidenceIds: ['validation:check'] }),
  review: async () => ({ passed: true, evidenceIds: ['review:approval'] }),
  authorization: async () => ({ passed: true, evidenceIds: ['authorization:actor'] }),
  submit: async () => ({ passed: true, evidenceIds: ['submit:provider'] }),
  track: async () => ({ passed: true, evidenceIds: ['track:number'] }),
  proof: async () => ({ passed: true, evidenceIds: ['proof:provider'] }),
})

describe('Code Enforcement Gold Standard workflow', () => {
  it('executes the complete procedural lifecycle', async () => {
    const result = await runCodeEnforcementGoldWorkflow(allPass())
    expect(result.status).toBe('completed')
    expect(result.stages.map(stage => stage.stage)).toEqual([
      'secure-ingest', 'classify', 'extract', 'timeline', 'evidence',
      'discrepancies', 'strategy', 'draft', 'validate', 'review',
      'authorization', 'submit', 'track', 'proof',
    ])
    expect(result.stages.every(stage => stage.evidenceIds.length > 0)).toBe(true)
  })

  it('blocks before submission when review fails', async () => {
    const dependencies = allPass()
    dependencies.review = async () => ({ passed: false, evidenceIds: [], message: 'review failed' })
    const result = await runCodeEnforcementGoldWorkflow(dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('review')
    expect(result.stages.some(stage => stage.stage === 'submit')).toBe(false)
  })

  it('blocks when procedural evidence analysis fails', async () => {
    const dependencies = allPass()
    dependencies.evidence = async () => ({ passed: false, evidenceIds: [], message: 'evidence failed' })
    const result = await runCodeEnforcementGoldWorkflow(dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('evidence')
  })

  it('requires proof before completion', async () => {
    const dependencies = allPass()
    dependencies.proof = async () => ({ passed: false, evidenceIds: [], message: 'proof unavailable' })
    const result = await runCodeEnforcementGoldWorkflow(dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('proof')
  })

  it('blocks a successful-looking stage with no evidence', async () => {
    const dependencies = allPass()
    dependencies.discrepancies = async () => ({ passed: true, evidenceIds: [], message: 'no provenance' })
    const result = await runCodeEnforcementGoldWorkflow(dependencies)

    expect(result.status).toBe('blocked')
    expect(result.stages.at(-1)?.stage).toBe('discrepancies')
    expect(result.stages.at(-1)?.status).toBe('blocked')
  })
})
