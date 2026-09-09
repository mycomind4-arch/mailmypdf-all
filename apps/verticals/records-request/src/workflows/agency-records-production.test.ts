import { describe, expect, it } from 'vitest'
import { AGENCY_RECORDS_CATEGORIES, buildAgencyRecordsRequest, productionAgencyRecordsRequestWorkflow } from './agency-records-production'

describe('production agency records front door', () => {
  it('keeps the canonical route and v2 workflow identity', () => {
    expect(productionAgencyRecordsRequestWorkflow.id).toBe('agency-records-request')
    expect(productionAgencyRecordsRequestWorkflow.seo.canonicalPath).toBe('/workflows/agency-records-request')
    expect(productionAgencyRecordsRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionAgencyRecordsRequestWorkflow.capabilities).toContain('approval')
    expect(productionAgencyRecordsRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a targeted agency request with office, custodian, system and production controls', () => {
    const request = buildAgencyRecordsRequest({
      agency: 'Example Department',
      jurisdiction: 'Example State',
      department: 'Program Integrity Division',
      recordsDescription: 'Existing records documenting Project AR-9 and related agency decisions.',
      subjectMatter: 'Project AR-9 administration and decisions',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      identifiers: 'Project AR-9',
      custodians: 'Program director and records unit',
      searchTerms: 'AR-9 approval decision',
      preferredFormat: 'native electronic files and CSV where maintained',
      systemsOrPrograms: 'Program Integrity case system',
      exclusions: 'exclude unrelated newsletters',
    })
    expect(request.items).toHaveLength(AGENCY_RECORDS_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'agency-index-metadata-and-request-status')).toBe(true)
    expect(request.items.some(item => item.category === 'program-operational-case-and-administrative-records')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-cross-indexed-and-attachment-records')).toBe(true)
    expect(request.items.some(item => item.category === 'fee-transfer-withholding-redaction-no-records-and-closure-status')).toBe(true)
  })

  it('does not treat sensitive agency information or unverified legal conclusions as public facts', () => {
    const request = buildAgencyRecordsRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      recordsDescription: 'Existing records about the identified agency matter.',
      subjectMatter: 'Agency activity',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not treat private personnel')
    expect(corpus).toContain("rather than inferring a deadline, exemption, disclosure entitlement, violation, or appeal right")
    expect(corpus).not.toContain('provide password')
  })
})
