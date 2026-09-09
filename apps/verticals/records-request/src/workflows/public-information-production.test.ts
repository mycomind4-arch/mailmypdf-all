import { describe, expect, it } from 'vitest'
import { buildPublicInformationRequest, PUBLIC_INFORMATION_CATEGORIES, productionPublicInformationRequestWorkflow } from './public-information-production'

describe('production public information front door', () => {
  it('keeps the canonical route and v2 workflow identity', () => {
    expect(productionPublicInformationRequestWorkflow.id).toBe('public-information-request')
    expect(productionPublicInformationRequestWorkflow.seo.canonicalPath).toBe('/workflows/public-information-request')
    expect(productionPublicInformationRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionPublicInformationRequestWorkflow.capabilities).toContain('approval')
    expect(productionPublicInformationRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a search-ready information/data request with production controls', () => {
    const request = buildPublicInformationRequest({
      agency: 'Example Public Agency',
      jurisdiction: 'Example State / Example City',
      department: 'Program Office',
      informationDescription: 'Existing reports, datasets, decisions, and communications concerning Program PI-7.',
      subjectMatter: 'Program PI-7 performance and decisions',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      identifiers: 'Program PI-7',
      custodians: 'Program director and records office',
      searchTerms: 'PI-7 performance decision',
      preferredFormat: 'native electronic files and CSV where maintained',
      dataFields: 'date, category, amount, status',
      exclusions: 'exclude unrelated newsletters',
    })
    expect(request.items).toHaveLength(PUBLIC_INFORMATION_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'reports-studies-statistics-dashboards-and-data')).toBe(true)
    expect(request.items.some(item => item.category === 'emails-correspondence-texts-and-communications')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-cross-indexed-and-attachment-records')).toBe(true)
    expect(request.items.some(item => item.category === 'fee-transfer-withholding-redaction-no-records-and-closure-status')).toBe(true)
  })

  it('does not convert public-information scope into unverified legal or privacy conclusions', () => {
    const request = buildPublicInformationRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      informationDescription: 'Existing information and records about the identified matter.',
      subjectMatter: 'Agency activity',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not treat private personnel')
    expect(corpus).toContain('do not infer a deadline, exemption, disclosure entitlement, violation, or appeal right')
    expect(corpus).not.toContain('provide password')
  })
})
