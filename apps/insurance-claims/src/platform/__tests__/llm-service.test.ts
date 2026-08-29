import { describe, it, expect } from 'vitest'
import { getAvailableProviders, isProviderAvailable, getDefaultModel } from '../llm-service'

describe('llm-service', () => {
  it('returns list of available providers based on env', () => {
    const providers = getAvailableProviders()
    expect(Array.isArray(providers)).toBe(true)
  })

  it('gemini is the default provider', () => {
    const available = getAvailableProviders()
    if (process.env.GEMINI_API_KEY) {
      expect(available).toContain('gemini')
    }
  })

  it('returns default model for each provider', () => {
    expect(getDefaultModel('gemini')).toBeTruthy()
    expect(getDefaultModel('claude')).toBeTruthy()
    expect(getDefaultModel('openai')).toBeTruthy()
  })

  it('isProviderAvailable returns boolean', () => {
    expect(typeof isProviderAvailable('gemini')).toBe('boolean')
    expect(typeof isProviderAvailable('claude')).toBe('boolean')
    expect(typeof isProviderAvailable('openai')).toBe('boolean')
  })
})
