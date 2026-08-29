import { describe, it, expect } from 'vitest'
import { runImmigrationMultiLlm, DEFAULT_IMMIGRATION_LLM_POLICY, type ImmigrationLlmExecutor } from './multi-llm-consensus'
import type { AIProvider, AITask } from './ai-provider'

function makeExecutor(provider: AIProvider, value: unknown, confidence = 0.9): ImmigrationLlmExecutor<typeof value> {
  return {
    provider,
    model: 'test-model',
    async execute(_task: AITask, _input: unknown) {
      return { value, confidence }
    },
  }
}

function makeFailingExecutor(provider: AIProvider): ImmigrationLlmExecutor<unknown> {
  return {
    provider,
    model: 'test-model',
    async execute() {
      throw new Error(`${provider} is down`)
    },
  }
}

describe('Immigration Mail Multi-LLM Consensus', () => {
  it('returns consensus when all providers agree', async () => {
    const value = { type: 'I-797C', action: 'rfe' }
    const executors = [
      makeExecutor('openai', value),
      makeExecutor('claude', value),
      makeExecutor('gemini', value),
    ]
    const result = await runImmigrationMultiLlm(executors, 'document_analysis', {}, DEFAULT_IMMIGRATION_LLM_POLICY)

    expect(result.value).toEqual(value)
    expect(result.agreement).toBe(1)
    expect(result.providers).toHaveLength(3)
    expect(result.disagreements).toHaveLength(0)
  })

  it('isolates failed providers and continues', async () => {
    const value = { type: 'I-797C' }
    const executors = [
      makeExecutor('openai', value),
      makeFailingExecutor('claude'),
      makeExecutor('gemini', value),
    ]
    const result = await runImmigrationMultiLlm(executors, 'document_analysis', {}, DEFAULT_IMMIGRATION_LLM_POLICY)

    expect(result.value).toEqual(value)
    expect(result.providers).toEqual(['openai', 'gemini'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('claude')
  })

  it('reports disagreements', async () => {
    const executors = [
      makeExecutor('openai', { type: 'a' }),
      makeExecutor('claude', { type: 'b' }),
      makeExecutor('gemini', { type: 'a' }),
    ]
    const result = await runImmigrationMultiLlm(executors, 'document_analysis', {}, DEFAULT_IMMIGRATION_LLM_POLICY)

    expect(result.value).toEqual({ type: 'a' })
    expect(result.disagreements).toEqual(['claude'])
    expect(result.warnings).toContain('MULTI_LLM_DISAGREEMENT_REQUIRES_REVIEW')
  })

  it('throws when quorum not met', async () => {
    const executors = [makeFailingExecutor('openai'), makeFailingExecutor('claude')]
    await expect(runImmigrationMultiLlm(executors, 'document_analysis', {}, { minimumProviders: 2, agreementThreshold: 0.5, maxProviders: 3 }))
      .rejects.toThrow('MULTI_LLM_RESULT_QUORUM_NOT_MET')
  })
})
