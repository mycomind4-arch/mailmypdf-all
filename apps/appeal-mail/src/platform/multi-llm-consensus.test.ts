import { describe, it, expect, vi } from 'vitest'
import { runMultiLlmConsensus, DEFAULT_APPEAL_LLM_POLICY } from './multi-llm-consensus'

// Mock the llm-service module
vi.mock('./llm-service', () => ({
  getAvailableProviders: () => ['gemini', 'claude', 'openai'] as const,
  callLLM: vi.fn(async (messages: unknown, config: { provider: string }) => {
    // All providers return the same text — full agreement
    return {
      text: 'This is a test response from the LLM.',
      provider: config.provider,
      model: 'test-model',
    }
  }),
}))

describe('Appeal Mail Multi-LLM Consensus', () => {
  it('returns consensus when all providers agree', async () => {
    const result = await runMultiLlmConsensus(
      [{ role: 'user', content: 'test' }],
      { temperature: 0.3 },
      DEFAULT_APPEAL_LLM_POLICY,
    )

    expect(result.text).toBe('This is a test response from the LLM.')
    expect(result.agreement).toBe(1)
    expect(result.providers).toHaveLength(3)
    expect(result.disagreements).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('isolates failed providers and continues', async () => {
    const { callLLM } = await import('./llm-service')
    vi.mocked(callLLM).mockImplementation(async (_messages: unknown, config: { provider: string }) => {
      if (config.provider === 'claude') throw new Error('Claude is down')
      return { text: 'test', provider: config.provider, model: 'test-model' } as never
    })

    const result = await runMultiLlmConsensus(
      [{ role: 'user', content: 'test' }],
      { temperature: 0.3 },
      DEFAULT_APPEAL_LLM_POLICY,
    )

    expect(result.providers).toEqual(['gemini', 'openai'])
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('claude')

    vi.mocked(callLLM).mockRestore()
  })
})
