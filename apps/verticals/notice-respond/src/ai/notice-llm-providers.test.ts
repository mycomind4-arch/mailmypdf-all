import { afterEach, describe, expect, it } from 'vitest'
import { getConfiguredNoticeLlmProviders } from './notice-llm-providers'

const original = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
}

afterEach(() => {
  if (original.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = original.anthropic
  if (original.openai === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = original.openai
  if (original.gemini === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = original.gemini
})

describe('Notice Respond LLM provider priority', () => {
  it('places Claude first when all providers are configured', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-test'
    process.env.OPENAI_API_KEY = 'openai-test'
    process.env.GEMINI_API_KEY = 'gemini-test'
    expect(getConfiguredNoticeLlmProviders().map(provider => provider.id)).toEqual(['anthropic', 'openai', 'gemini'])
  })

  it('uses Claude alone when it is the only configured provider', () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-test'
    delete process.env.OPENAI_API_KEY
    delete process.env.GEMINI_API_KEY
    expect(getConfiguredNoticeLlmProviders().map(provider => provider.id)).toEqual(['anthropic'])
  })
})
