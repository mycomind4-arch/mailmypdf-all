import { describe, expect, it } from 'vitest'
import {
  buildGovernmentCommunicationsRequest,
  GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES,
  governmentCommunicationsRecordsWorkflow,
} from './government-communications-records'

describe('government communications records workflow', () => {
  it('keeps canonical identity and moves communications to v2', () => {
    expect(governmentCommunicationsRecordsWorkflow.id).toBe('government-communications-records')
    expect(governmentCommunicationsRecordsWorkflow.seo.canonicalPath).toBe('/workflows/government-communications-records')
    expect(governmentCommunicationsRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(governmentCommunicationsRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(governmentCommunicationsRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(governmentCommunicationsRecordsWorkflow.request.categories).toContain('withholding-redaction-no-records-and-request-status')
  })

  it('builds a targeted communications scope with custodians, systems, formats and narrowing', () => {
    const request = buildGovernmentCommunicationsRequest({
      agency: 'Example City',
      jurisdiction: 'Example City, Example State',
      department: 'City Manager and Procurement',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Downtown redevelopment procurement and related agency decision-making',
      custodians: 'Jane Smith; John Doe',
      keywords: 'Downtown RFP; contract 26-104',
      externalParties: 'Example Development LLC; Example Consulting Inc.',
      systems: 'agency email; Teams',
      preferredFormat: 'native EML/MSG with metadata and native attachments where available',
      exclusions: 'exclude newsletters and unrelated citywide announcements',
    })

    expect(request.items).toHaveLength(GOVERNMENT_COMMUNICATION_RECORD_CATEGORIES.length)
    expect(request.jurisdiction).toBe('Example City, Example State')
    expect(request.items.some(item => item.category === 'email-attachments')).toBe(true)
    expect(request.items.some(item => item.category === 'communication-search-metadata')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-redaction-no-records-and-request-status')).toBe(true)
    expect(request.items.find(item => item.category === 'emails')?.format).toContain('native EML/MSG')
    expect(request.items.find(item => item.category === 'emails')?.description).toContain('custodians Jane Smith, John Doe')
    expect(request.items.find(item => item.category === 'emails')?.description).toContain('Scope exclusions/narrowing')
  })

  it('requires jurisdiction and at least one meaningful communications search constraint', () => {
    const request = buildGovernmentCommunicationsRequest({
      agency: 'Example City',
      dateStart: '2026-01-01',
      dateEnd: '2026-03-01',
      subjectMatter: 'Redevelopment',
    })

    expect(governmentCommunicationsRecordsWorkflow.validateRequest(request)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'jurisdiction' }),
      expect.objectContaining({ field: 'searchConstraints' }),
    ]))
  })

  it('preserves privacy, privilege and security boundaries instead of demanding secrets or assuming disclosure', () => {
    const request = buildGovernmentCommunicationsRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Agency communications concerning a disputed project decision',
      custodians: ['records officer'],
      systems: ['agency email'],
    })

    const corpus = request.items.map(item => item.description).join(' ').toLowerCase()
    expect(corpus).toContain('do not request passwords')
    expect(corpus).toContain('do not assume attorney-client')
    expect(corpus).toContain('preserve the agency\'s stated basis rather than inventing')
    expect(corpus).toContain('personal phone contents')
  })

  it('ignores unknown categories instead of creating arbitrary request items', () => {
    const request = buildGovernmentCommunicationsRequest({
      agency: 'Example City',
      jurisdiction: 'Example State',
      dateStart: '2026-01-01',
      dateEnd: '2026-03-01',
      subjectMatter: 'Redevelopment',
      custodians: ['Jane'],
      categories: ['emails', '<script>', 'unknown'],
    })
    expect(request.items.map(item => item.category)).toEqual(['emails'])
  })
})
