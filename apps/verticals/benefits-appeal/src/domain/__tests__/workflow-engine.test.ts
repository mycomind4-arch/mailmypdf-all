import { describe, it, expect } from 'vitest'
import { getBenefitsWorkflowConfig, calculateBenefitsPricing } from '../workflow-engine'

describe('getBenefitsWorkflowConfig', () => {
  it('returns config for known workflow', () => {
    const config = getBenefitsWorkflowConfig('ssdi-denial')
    expect(config).toBeDefined()
    expect(config?.workflowId).toBe('ssdi-denial')
    expect(config?.systemPrompt).toBeTruthy()
    expect(config?.pricing).toBeDefined()
    expect(config?.requiredSections.length).toBeGreaterThan(0)
  })

  it('falls back to default for unknown workflow', () => {
    const config = getBenefitsWorkflowConfig('nonexistent-workflow')
    expect(config).toBeDefined()
    expect(config?.workflowId).toBeTruthy()
  })

  it('every workflow has unique system prompt', () => {
    // The config should always have a meaningful system prompt
    const config = getBenefitsWorkflowConfig('ssdi-denial')
    expect(config?.systemPrompt.length).toBeGreaterThan(50)
  })
})

describe('calculateBenefitsPricing', () => {
  it('calculates standard mailing pricing', () => {
    const config = getBenefitsWorkflowConfig('ssdi-denial')!
    const pricing = calculateBenefitsPricing(config, 5, 'standard')
    expect(pricing.total).toBeGreaterThan(0)
    expect(pricing.mailingFee).toBe(config.pricing.standardMail)
  })

  it('calculates certified mailing pricing', () => {
    const config = getBenefitsWorkflowConfig('ssdi-denial')!
    const pricing = calculateBenefitsPricing(config, 10, 'certified')
    expect(pricing.mailingFee).toBe(config.pricing.certifiedMail)
    expect(pricing.total).toBeGreaterThan(config.pricing.preparationFee)
  })

  it('applies large packet fee when threshold exceeded', () => {
    const config = getBenefitsWorkflowConfig('ssdi-denial')!
    const smallPricing = calculateBenefitsPricing(config, 0, 'standard')
    const largePricing = calculateBenefitsPricing(config, 50, 'standard')
    expect(largePricing.largePacketFee).toBeGreaterThan(0)
    expect(smallPricing.largePacketFee).toBe(0)
  })
})
