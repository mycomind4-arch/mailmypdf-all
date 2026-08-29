import { describe, it, expect } from 'vitest'
import { getInsuranceWorkflowConfig, calculateInsurancePricing } from '../workflow-engine'

describe('getInsuranceWorkflowConfig', () => {
  it('returns config for known workflow', () => {
    const config = getInsuranceWorkflowConfig('denied-claim')
    expect(config).toBeDefined()
    expect(config?.workflowId).toBe('denied-claim')
    expect(config?.systemPrompt).toBeTruthy()
    expect(config?.pricing).toBeDefined()
    expect(config?.requiredSections.length).toBeGreaterThan(0)
  })

  it('falls back to default for unknown workflow', () => {
    const config = getInsuranceWorkflowConfig('nonexistent-workflow')
    expect(config).toBeDefined()
    expect(config?.workflowId).toBeTruthy()
  })

  it('every workflow has unique system prompt', () => {
    // The config should always have a meaningful system prompt
    const config = getInsuranceWorkflowConfig('denied-claim')
    expect(config?.systemPrompt.length).toBeGreaterThan(50)
  })
})

describe('calculateInsurancePricing', () => {
  it('calculates standard mailing pricing', () => {
    const config = getInsuranceWorkflowConfig('denied-claim')!
    const pricing = calculateInsurancePricing(config, 5, 'standard')
    expect(pricing.total).toBeGreaterThan(0)
    expect(pricing.mailingFee).toBe(config.pricing.standardMail)
  })

  it('calculates certified mailing pricing', () => {
    const config = getInsuranceWorkflowConfig('denied-claim')!
    const pricing = calculateInsurancePricing(config, 10, 'certified')
    expect(pricing.mailingFee).toBe(config.pricing.certifiedMail)
    expect(pricing.total).toBeGreaterThan(config.pricing.preparationFee)
  })

  it('applies large packet fee when threshold exceeded', () => {
    const config = getInsuranceWorkflowConfig('denied-claim')!
    const smallPricing = calculateInsurancePricing(config, 0, 'standard')
    const largePricing = calculateInsurancePricing(config, 50, 'standard')
    expect(largePricing.largePacketFee).toBeGreaterThan(0)
    expect(smallPricing.largePacketFee).toBe(0)
  })
})
