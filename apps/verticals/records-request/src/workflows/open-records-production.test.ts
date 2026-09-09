import { describe, expect, it } from 'vitest'
import { buildOpenRecordsRequest, OPEN_RECORDS_CATEGORIES, productionOpenRecordsRequestWorkflow } from './open-records-production'

describe('production open records front door', () => {
  it('keeps the canonical route and v2 workflow identity', () => {
    expect(productionOpenRecordsRequestWorkflow.id).toBe('open-records-request')
    expect(productionOpenRecordsRequestWorkflow.seo.canonicalPath).toBe('/workflows/open-records-request')
    expect(productionOpenRecordsRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionOpenRecordsRequestWorkflow.capabilities).toContain('approval')
    expect(productionOpenRecordsRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a state/local search-ready request with production controls', () => {
    const request = buildOpenRecordsRequest({
      agency: 'Example County Department',
      jurisdiction: 'Example State / Example County',
      department: 'Records Office',
      recordsDescription: 'Existing records documenting Project OR-22 and related agency decisions.',
      subjectMatter: 'Project OR-22 decision history',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      identifiers: 'Project OR-22',
      custodians: 'Program manager and records custodian',
      searchTerms: 'OR-22 project decision',
      preferredFormat: 'native electronic files and CSV where maintained',
      feePreference: 'notify requester before costs exceed $50',
      exclusions: 'exclude unrelated newsletters',
    })
    expect(request.items).toHaveLength(OPEN_RECORDS_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'record-index-metadata-and-request-status')).toBe(true)
    expect(request.items.some(item => item.category === 'emails-correspondence-texts-and-communications')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-cross-indexed-and-attachment-records')).toBe(true)
    expect(request.items.some(item => item.category === 'fee-withholding-redaction-no-records-and-closure-status')).toBe(true)
  })

  it('does not assume protected data or jurisdiction-specific legal conclusions', () => {
    const request = buildOpenRecordsRequest({
      agency: 'Example City',
      jurisdiction: 'Example State / Example City',
      recordsDescription: 'Existing records about the identified matter.',
      subjectMatter: 'Agency activity',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not treat private personnel')
    expect(corpus).toContain('do not infer a deadline, exemption, waiver, violation, appeal right, or disclosure entitlement')
    expect(corpus).not.toContain('provide password')
  })
})
