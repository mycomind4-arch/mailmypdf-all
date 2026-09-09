import { describe, expect, it } from 'vitest'
import {
  SEARCH_WARRANT_RECORD_CATEGORIES,
  buildSearchWarrantRecordsRequest,
  searchWarrantRecordsWorkflow,
} from './search-warrant-records'

describe('search warrant records workflow', () => {
  it('builds a warrant-centered request with separate return and sealing records', () => {
    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      warrantNumber: 'SW-2026-88',
      caseNumber: 'CR-2026-501',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      location: '123 Main Street',
      categories: [
        'warrant-and-order',
        'return-and-inventory',
        'sealing-unsealing-and-access-orders',
      ],
    })

    expect(request.title).toContain('SW-2026-88')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('search warrant')
    expect(request.items[1].description).toContain('inventory')
    expect(request.items[2].description).toContain('sealing')
  })

  it('declares the executable records capability contract', () => {
    expect(searchWarrantRecordsWorkflow.contractVersion).toBe(2)
    expect(searchWarrantRecordsWorkflow.manifest.id).toBe('search-warrant-records')
    expect(searchWarrantRecordsWorkflow.request.categories).toEqual(SEARCH_WARRANT_RECORD_CATEGORIES)
    expect(searchWarrantRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('flags missing return and docket records in a partial production', async () => {
    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      warrantNumber: 'SW-2026-88',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      location: '123 Main Street',
      categories: [
        'warrant-and-order',
        'return-and-inventory',
        'docket-index-and-case-tracking',
      ],
    })
    const analysis = await searchWarrantRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'warrant.pdf',
          category: 'warrant-and-order',
          text: 'Search warrant SW-2026-88. The return and inventory are referenced but not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('return-and-inventory')
    expect(analysis.missingCategoryIds).toContain('docket-index-and-case-tracking')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
