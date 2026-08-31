import { describe, expect, it } from 'vitest'
import { NullJurisdictionPolicyProvider } from './policy'

describe('jurisdiction policy contract', () => {
  it('fails closed when no jurisdiction policy is configured', async () => {
    const provider = new NullJurisdictionPolicyProvider()
    await expect(provider.getPolicy()).resolves.toBeNull()
  })
})
