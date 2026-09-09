import { describe, expect, it } from 'vitest'
import { buildGovernmentDocumentsRequest, GOVERNMENT_DOCUMENTS_CATEGORIES, productionGovernmentDocumentsRequestWorkflow } from './government-documents-production'

describe('production government documents front door', () => {
  it('keeps the canonical route and v2 workflow identity', () => {
    expect(productionGovernmentDocumentsRequestWorkflow.id).toBe('government-documents-request')
    expect(productionGovernmentDocumentsRequestWorkflow.seo.canonicalPath).toBe('/workflows/government-documents-request')
    expect(productionGovernmentDocumentsRequestWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionGovernmentDocumentsRequestWorkflow.capabilities).toContain('approval')
    expect(productionGovernmentDocumentsRequestWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a version-aware document request with attachment and copy-status controls', () => {
    const request = buildGovernmentDocumentsRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      department: 'Publications Office',
      recordsDescription: 'Existing reports, directives, appendices, and versions concerning Project GD-3.',
      subjectMatter: 'Project GD-3 official documentation',
      documentType: 'report and directive',
      documentTitleOrNumber: 'GD-3 Final Report / Directive 14',
      authorOrOffice: 'Program Office',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      versionOrEdition: 'all maintained revisions including final issued version',
      identifiers: 'Project GD-3',
      searchTerms: 'GD-3 final report directive 14',
      preferredFormat: 'native electronic files and PDF',
      certifiedCopyNeeded: 'official or certified copy if actually available',
      exclusions: 'exclude unrelated newsletters',
    })
    expect(request.items).toHaveLength(GOVERNMENT_DOCUMENTS_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'versions-drafts-revisions-superseded-and-effective-documents')).toBe(true)
    expect(request.items.some(item => item.category === 'attachments-enclosures-exhibits-and-referenced-documents')).toBe(true)
    expect(request.items.some(item => item.category === 'certified-official-copy-format-and-delivery-status')).toBe(true)
    expect(request.items.some(item => item.category === 'fee-withholding-redaction-no-records-and-request-status')).toBe(true)
  })

  it('does not invent version, certification, publication, or legal status', () => {
    const request = buildGovernmentDocumentsRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      recordsDescription: 'Existing documents about the identified matter.',
      subjectMatter: 'Agency documents',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not label a document draft, final, superseded, effective, approved, or official unless the record evidence establishes that status.')
    expect(corpus).toContain('do not claim certification, authenticity, official-copy status, or availability unless established')
    expect(corpus).not.toContain('provide password')
  })
})
