import { describe, expect, it } from 'vitest'
import type { ProductionIntelligenceProvider } from './records-intelligence'

describe('production intelligence contract', () => {
  it('defines the production-to-evidence-to-finding-to-action boundary', () => {
    const provider: ProductionIntelligenceProvider = {
      ingestProduction: async (input) => input,
      attachEvidence: async (input) => input,
      createFinding: async (input) => input,
      createAction: async (input) => input,
    }

    expect(provider.ingestProduction).toBeTypeOf('function')
    expect(provider.attachEvidence).toBeTypeOf('function')
    expect(provider.createFinding).toBeTypeOf('function')
    expect(provider.createAction).toBeTypeOf('function')
  })
})
