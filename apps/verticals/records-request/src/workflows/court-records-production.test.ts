import { describe, expect, it } from 'vitest'
import {
  COURT_RECORD_CATEGORIES,
  buildCourtRecordsRequest,
  productionCourtRecordsWorkflow,
} from './court-records-production'

describe('production court records workflow', () => {
  it('builds a case-centered docket, filing, and access-status request', () => {
    const request = buildCourtRecordsRequest({
      court: 'Example Superior Court',
      caseNumber: 'CASE-100',
      parties: 'Example A v. Example B',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      subjectMatter: 'Civil case records',
      categories: [
        'docket-register-case-index-and-status',
        'orders-rulings-judgments-and-decrees',
        'sealing-confidentiality-redaction-and-access-status-records',
      ],
    })

    expect(request.title).toContain('CASE-100')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Docket sheets')
    expect(request.items[0].format).toContain('structured format')
    expect(request.items[1].description).toContain('orders')
    expect(request.items[2].description).toContain('sealing')
  })

  it('keeps the canonical court-records identity with a production contract', () => {
    expect(productionCourtRecordsWorkflow.contractVersion).toBe(2)
    expect(productionCourtRecordsWorkflow.manifest.id).toBe('court-records')
    expect(productionCourtRecordsWorkflow.request.categories).toEqual(COURT_RECORD_CATEGORIES)
    expect(productionCourtRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing orders and access-status records in a partial production', async () => {
    const request = buildCourtRecordsRequest({
      court: 'Example Superior Court',
      caseNumber: 'CASE-100',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      subjectMatter: 'Civil case records',
      categories: [
        'docket-register-case-index-and-status',
        'orders-rulings-judgments-and-decrees',
        'sealing-confidentiality-redaction-and-access-status-records',
      ],
    })

    const analysis = await productionCourtRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'docket.pdf',
        category: 'docket-register-case-index-and-status',
        text: 'Docket index. Order and access-status notice are referenced but not attached. Portions redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('orders-rulings-judgments-and-decrees')
    expect(analysis.missingCategoryIds).toContain('sealing-confidentiality-redaction-and-access-status-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
