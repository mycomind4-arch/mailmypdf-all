import { afterEach, describe, expect, it } from 'vitest'
import { buildLLMConfig, buildProviderConfigs, getProvidersForOperation } from './llm-config'
import { ALL_PROVIDERS, DEFAULT_PROVIDER, MODE_STRATEGIES } from './llm-types'

const keys = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL',
  'GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GEMINI_MODEL', 'LLM_PROVIDER',
] as const
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]))

function clearProviders() {
  for (const key of keys) delete process.env[key]
}

afterEach(() => {
  clearProviders()
  for (const key of keys) {
    const value = original[key]
    if (value !== undefined) process.env[key] = value
  }
})

describe('Private Office Claude-first runtime', () => {
  it('declares Anthropic as the default and first provider', () => {
    expect(DEFAULT_PROVIDER).toBe('anthropic')
    expect(ALL_PROVIDERS).toEqual(['anthropic', 'openai', 'gemini'])
    expect(MODE_STRATEGIES.standard.providers).toEqual(['anthropic'])
    expect(MODE_STRATEGIES.consensus.providers[0]).toBe('anthropic')
    expect(MODE_STRATEGIES['maximum-assurance'].providers).toEqual(['anthropic', 'openai', 'gemini'])
  })

  it('builds Claude first with the production default model', () => {
    clearProviders()
    process.env.ANTHROPIC_API_KEY = 'anthropic-test'
    process.env.OPENAI_API_KEY = 'openai-test'
    process.env.GEMINI_API_KEY = 'gemini-test'
    const providers = buildProviderConfigs()
    expect(Object.keys(providers)).toEqual(['anthropic', 'openai', 'gemini'])
    expect(providers.anthropic?.model).toBe('claude-sonnet-5')
    expect(buildLLMConfig().defaultProvider).toBe('anthropic')
  })

  it('preserves deterministic workflow availability when Claude is temporarily unconfigured', () => {
    clearProviders()
    process.env.OPENAI_API_KEY = 'openai-test'
    process.env.GEMINI_API_KEY = 'gemini-test'
    const config = buildLLMConfig()
    expect(config.defaultProvider).toBe('openai')
    expect(getProvidersForOperation('analyze', config)).toEqual(['openai'])
  })

  it('honors an explicit configured override but rejects an unavailable explicit provider', () => {
    clearProviders()
    process.env.ANTHROPIC_API_KEY = 'anthropic-test'
    process.env.OPENAI_API_KEY = 'openai-test'
    process.env.LLM_PROVIDER = 'openai'
    expect(buildLLMConfig().defaultProvider).toBe('openai')

    process.env.LLM_PROVIDER = 'gemini'
    expect(() => buildLLMConfig()).toThrow(/not configured/)
  })
})
