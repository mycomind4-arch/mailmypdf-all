import { describe, expect, it } from 'vitest'
import { buildPublicRecordsRequest, PUBLIC_RECORDS_CATEGORIES, publicRecordsRequestWorkflow } from './public-records-request'

describe('production public records front door', () => {
  it('keeps the canonical front-door route and v2 capabilities', () => {
    expect(publicRecordsRequestWorkflow.id).toBe('public-records-request')
    expect(publicRecordsRequestWorkflow.seo.canonicalPath).toBe('/workflows/public-records-request')
    expect(publicRecordsRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(publicRecordsRequestWorkflow.capabilities).toContain('approval')
    expect(publicRecordsRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a search-ready request with indexes, communications, data and status controls', () => {
    const request = buildPublicRecordsRequest({
      agency: 'Example Public Agency',
      jurisdiction: 'Example jurisdiction',
      department: 'Example Program Office',
      recordsDescription: 'Existing records documenting the identified project and agency decisions.',
      subjectMatter: 'Project decision history',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      identifiers: 'Project EX-100',
      custodians: 'Program manager and records office',
      searchTerms: 'EX-100 project decision',
      preferredFormat: 'native electronic files and CSV where maintained',
      exclusions: 'exclude newsletters unrelated to the project',
    })
    expect(request.items).toHaveLength(PUBLIC_RECORDS_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'record-index-metadata-and-access-status')).toBe(true)
    expect(request.items.some(item => item.category === 'emails-correspondence-texts-and-communications')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-cross-indexed-and-attachment-records')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-redaction-no-records-and-request-status')).toBe(true)
  })

  it('does not treat protected personnel or authentication information as automatically public', () => {
    const request = buildPublicRecordsRequest({
      agency: 'Example Public Agency',
      jurisdiction: 'Example jurisdiction',
      recordsDescription: 'Existing records about the identified matter.',
      subjectMatter: 'Agency activity',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not treat private personnel')
    expect(corpus).toContain('protected material is publicly disclosable')
    expect(corpus).not.toContain('provide password')
  })
})
