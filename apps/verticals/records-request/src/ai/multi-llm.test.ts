import { describe, expect, it } from 'vitest'
import { executeWithMultipleLlmProviders, type LlmProvider } from './multi-llm'

type Output = { value: string }

function provider(id: string, output: Output): LlmProvider {
  return {
    id,
    execute: async <I, O>() => ({
      provider: id,
      model: `${id}-model`,
      output: output as O,
      confidence: 0.9,
      warnings: [] as readonly string[],
    }),
  }
}

describe('multi-LLM orchestration', () => {
  it('uses consensus and retains every provider result', async () => {
    const result = await executeWithMultipleLlmProviders(
      [provider('provider-a', { value: 'same' }), provider('provider-b', { value: 'same' }), provider('provider-c', { value: 'different' })],
      { id: 'task', input: 'record', outputSchema: 'object' },
    )

    expect(result.selected.output).toEqual({ value: 'same' })
    expect(result.candidates).toHaveLength(3)
    expect(result.agreement).toBeCloseTo(2 / 3)
    expect(result.warnings).toContain('LLM providers disagreed across 2 distinct outputs')
  })

  it('fails closed when fewer than the minimum providers succeed', async () => {
    const failing: LlmProvider = {
      id: 'failed',
      async execute<I, O>() { throw new Error('provider unavailable') },
    }

    await expect(executeWithMultipleLlmProviders(
      [failing],
      { id: 'task', input: 'record', outputSchema: 'string' },
      { minProviders: 2 },
    )).rejects.toThrow('Insufficient LLM providers succeeded')
  })

  it('supports an explicit consensus quorum', async () => {
    const result = await executeWithMultipleLlmProviders(
      [provider('a', { value: 'one' }), provider('b', { value: 'two' })],
      { id: 'task', input: 'record', outputSchema: 'object' },
      { quorum: 0.75 },
    )

    expect(result.agreement).toBe(0.5)
    expect(result.warnings).toContain('LLM consensus below required quorum: 0.50 < 0.75')
  })
})
