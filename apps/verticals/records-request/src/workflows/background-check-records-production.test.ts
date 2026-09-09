import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_CHECK_RECORD_CATEGORIES,
  buildBackgroundCheckRecordsRequest,
  productionBackgroundCheckRecordsWorkflow,
} from './background-check-records-production'

describe('production background check records workflow', () => {
  it('builds an authorized report and source-record request', () => {
    const request = buildBackgroundCheckRecordsRequest({
      agency: 'Example Screening Unit',
      personName: 'Example Subject',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      accessBasis: 'Authorized request',
      subjectMatter: 'Screening report and source records',
      categories: [
        'background-check-report-and-result-summary',
        'search-scope-criteria-and-source-index',
        'correction-dispute-and-reinvestigation-records',
      ],
    })

    expect(request.title).toContain('Example Subject')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('background-check report')
    expect(request.items[1].format).toContain('structured format')
    expect(request.items[2].description).toContain('disputes')
  })

  it('keeps the canonical background-check-records identity with a production contract', () => {
    expect(productionBackgroundCheckRecordsWorkflow.contractVersion).toBe(2)
    expect(productionBackgroundCheckRecordsWorkflow.manifest.id).toBe('background-check-records')
    expect(productionBackgroundCheckRecordsWorkflow.request.categories).toEqual(BACKGROUND_CHECK_RECORD_CATEGORIES)
    expect(productionBackgroundCheckRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing source and correction records in a partial production', async () => {
    const request = buildBackgroundCheckRecordsRequest({
      agency: 'Example Screening Unit',
      personName: 'Example Subject',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      accessBasis: 'Authorized request',
      subjectMatter: 'Screening report and source records',
      categories: [
        'background-check-report-and-result-summary',
        'search-scope-criteria-and-source-index',
        'correction-dispute-and-reinvestigation-records',
      ],
    })

    const analysis = await productionBackgroundCheckRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'screening-summary.pdf',
          category: 'background-check-report-and-result-summary',
          text: 'Final screening summary. Source index and dispute response are referenced but not attached. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('search-scope-criteria-and-source-index')
    expect(analysis.missingCategoryIds).toContain('correction-dispute-and-reinvestigation-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
