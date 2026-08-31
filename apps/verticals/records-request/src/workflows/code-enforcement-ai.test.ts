import { describe, expect, it } from 'vitest'
import { assessContradiction, buildCodeEnforcementRequestStrategy, classifyProductionRecord, extractCodeEnforcementFacts } from './code-enforcement-ai'
import type { LlmProvider } from '../ai/multi-llm-orchestrator'

const policy = { minimumProviders: 2, agreementThreshold: 0.66, maxProviders: 3 }

function provider(id: string, value: unknown): LlmProvider {
  return {
    id,
    complete: async <T>() => ({
      provider: id,
      model: `${id}-model`,
      value: value as T,
      confidence: 0.9,
      warnings: [],
    }),
  }
}

describe('code enforcement multi-LLM tasks', () => {
  it('classifies a production record through multiple providers', async () => {
    const result = await classifyProductionRecord(
      [provider('a', { category: 'inspection', rationale: 'inspection report' }), provider('b', { category: 'inspection', rationale: 'inspection report' })],
      { id: 'r1', filename: 'inspection.pdf', text: 'Inspection report' }, policy,
    )
    expect(result.value.category).toBe('inspection')
    expect(result.providers).toEqual(['a', 'b'])
  })

  it('extracts structured code-enforcement facts', async () => {
    const result = await extractCodeEnforcementFacts(
      [provider('a', { caseNumbers: ['CE-1'], parcelNumbers: [], addresses: ['1 Main St'], dates: [], people: [] }), provider('b', { caseNumbers: ['CE-1'], parcelNumbers: [], addresses: ['1 Main St'], dates: [], people: [] })],
      { id: 'r1', filename: 'case.pdf', text: 'Case CE-1 at 1 Main St' }, policy,
    )
    expect(result.value.caseNumbers).toEqual(['CE-1'])
  })

  it('requires consensus for contradiction analysis', async () => {
    const result = await assessContradiction(
      [provider('a', { contradictory: true, explanation: 'dates differ' }), provider('b', { contradictory: true, explanation: 'dates differ' })],
      { id: 'a', filename: 'a.pdf', text: 'Inspection Jan 1' },
      { id: 'b', filename: 'b.pdf', text: 'Inspection Jan 3' }, policy,
    )
    expect(result.value.contradictory).toBe(true)
  })

  it('builds a schema-validated request strategy', async () => {
    const result = await buildCodeEnforcementRequestStrategy(
      [
        provider('a', { likelyCustodians: ['Code Enforcement'], searchTerms: ['case file'], scopeGaps: [], overbreadthRisks: ['date range'], identifiersToConfirm: ['case number'], followUpPriorities: ['inspection records'] }),
        provider('b', { likelyCustodians: ['Code Enforcement'], searchTerms: ['case file'], scopeGaps: [], overbreadthRisks: ['date range'], identifiersToConfirm: ['case number'], followUpPriorities: ['inspection records'] }),
      ],
      { agency: 'Example City', workflow: 'code-enforcement-records' },
      policy,
    )
    expect(result.value.likelyCustodians).toEqual(['Code Enforcement'])
    expect(result.providers).toEqual(['a', 'b'])
  })

  it('rejects malformed strategy output', async () => {
    await expect(buildCodeEnforcementRequestStrategy(
      [provider('a', {}), provider('b', {})],
      { agency: 'Example City', workflow: 'code-enforcement-records' },
      policy,
    )).rejects.toThrow('CODE_ENFORCEMENT_AI_SCHEMA_INVALID')
  })
})
