import { describe, it, expect } from 'vitest'
import { validateRequiredFacts } from './fact-validation'

describe('Fact Validation', () => {
  it('validates complete business facts', () => {
    expect(validateRequiredFacts(['amount', 'invoiceNumber'], { amount: 100, invoiceNumber: 'INV-1' })).toEqual({ valid: true, missing: [] })
  })

  it('reports missing business facts deterministically', () => {
    expect(validateRequiredFacts(['amount', 'invoiceNumber'], { amount: 100 })).toEqual({ valid: false, missing: ['invoiceNumber'] })
  })
})
