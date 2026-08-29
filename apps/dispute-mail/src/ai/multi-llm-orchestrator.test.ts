import { describe, it, expect } from 'vitest'
import { runMultiLlm, DEFAULT_DISPUTE_LLM_POLICY, type DisputeLlmProvider, type DisputeLlmTask } from './multi-llm-orchestrator'

function makeProvider(id: string, value: unknown, confidence = 0.9): DisputeLlmProvider {
  return {
    id,
    async complete<T>(_task: DisputeLlmTask, _system: string, _input: unknown) {
      return { provider: id, model: 'test-model', value: value as T, confidence, warnings: [] }
    },
  }
}

function makeFailingProvider(id: string): DisputeLlmProvider {
  return {
    id,
    async complete() {
      throw new Error(`${id} is down`)
    },
  }
}

describe('Multi-LLM Orchestrator', () => {
  it('selects the result with the highest agreement when all providers agree', async () => {
    const value = { type: 'credit-dispute', confidence: 0.95 }
    const providers = [makeProvider('openai', value), makeProvider('anthropic', value), makeProvider('gemini', value)]
    const result = await runMultiLlm(providers, 'classification', 'system prompt', {}, DEFAULT_DISPUTE_LLM_POLICY)

    expect(result.value).toEqual(value)
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.providers).toHaveLength(3)
    expect(result.disagreements).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('isolates failed providers and continues with the rest', async () => {
    const value = { type: 'debt-validation' }
    const providers = [
      makeProvider('openai', value),
      makeFailingProvider('anthropic'),
      makeProvider('gemini', value),
    ]
    const result = await runMultiLlm(providers, 'extraction', 'system', {}, DEFAULT_DISPUTE_LLM_POLICY)

    expect(result.value).toEqual(value)
    expect(result.providers).toEqual(['openai', 'gemini'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('anthropic')
  })

  it('reports disagreements when providers return different results', async () => {
    const providers = [
      makeProvider('openai', { type: 'a' }),
      makeProvider('anthropic', { type: 'b' }),
      makeProvider('gemini', { type: 'a' }),
    ]
    const result = await runMultiLlm(providers, 'strategy', 'system', {}, DEFAULT_DISPUTE_LLM_POLICY)

    expect(result.value).toEqual({ type: 'a' })
    expect(result.disagreements).toEqual(['anthropic'])
    expect(result.warnings).toContain('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW')
  })

  it('throws when quorum is not met', async () => {
    const providers = [makeFailingProvider('openai'), makeFailingProvider('anthropic')]
    await expect(runMultiLlm(providers, 'classification', '', {}, { minimumProviders: 2, agreementThreshold: 0.5, maxProviders: 3 }))
      .rejects.toThrow('MULTI_LLM_RESULT_QUORUM_NOT_MET')
  })

  it('throws when fewer providers than minimum are available', async () => {
    const providers = [makeProvider('openai', {})]
    await expect(runMultiLlm(providers, 'classification', '', {}, { minimumProviders: 2, agreementThreshold: 0.5, maxProviders: 3 }))
      .rejects.toThrow('MULTI_LLM_PROVIDER_QUORUM_NOT_MET')
  })
})
