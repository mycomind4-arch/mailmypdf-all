import { describe, expect, it } from 'vitest'
import { runMultiLlm, type LlmProvider } from './multi-llm-orchestrator'

const provider = <T>(id: string, value: T, confidence = 0.9): LlmProvider => ({
  id,
  complete: async <O>() => ({ provider: id, model: `${id}-model`, value: value as unknown as O, confidence, warnings: [] }),
})

describe('multi-LLM orchestrator', () => {
  it('requires a provider quorum', async () => {
    await expect(runMultiLlm([provider('a', 'x')], 'classification', {}, {
      minimumProviders: 2, agreementThreshold: 0.66, maxProviders: 3,
    })).rejects.toThrow('MULTI_LLM_PROVIDER_QUORUM_NOT_MET')
  })

  it('returns consensus when providers agree', async () => {
    const result = await runMultiLlm(
      [provider('a', 'inspection'), provider('b', 'inspection'), provider('c', 'inspection')],
      'classification', {}, { minimumProviders: 2, agreementThreshold: 0.66, maxProviders: 3 },
    )
    expect(result.value).toBe('inspection')
    expect(result.disagreements).toEqual([])
    expect(result.providers).toHaveLength(3)
  })

  it('surfaces disagreement instead of pretending certainty', async () => {
    const result = await runMultiLlm(
      [provider('a', 'inspection'), provider('b', 'complaint'), provider('c', 'complaint')],
      'classification', {}, { minimumProviders: 2, agreementThreshold: 0.8, maxProviders: 3 },
    )
    expect(result.warnings).toContain('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW')
    expect(result.disagreements).toContain('a')
  })
})
