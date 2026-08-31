import { describe, expect, it } from 'vitest'
import { isExecutableDomainPack, missingDomainCapabilities } from './domain-pack'
import type { RecordsDomainPackManifest } from './domain-pack'

describe('records domain pack contract', () => {
  const manifest: RecordsDomainPackManifest = {
    id: 'code-enforcement-records',
    name: 'Code Enforcement Records',
    version: '1.0.0',
    capabilities: ['classification', 'extraction', 'evidence', 'validation', 'review', 'approval'],
  }

  it('reports missing declared capabilities', () => {
    expect(missingDomainCapabilities(manifest, ['classification', 'evidence', 'mailing']))
      .toEqual(['mailing'])
  })

  it('certifies a manifest only when all required capabilities are present', () => {
    expect(isExecutableDomainPack(manifest, ['classification', 'evidence', 'approval'])).toBe(true)
    expect(isExecutableDomainPack(manifest, ['classification', 'mailing'])).toBe(false)
  })
})
