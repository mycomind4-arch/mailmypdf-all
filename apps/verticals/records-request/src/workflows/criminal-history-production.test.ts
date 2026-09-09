import { describe, expect, it } from 'vitest'
import {
  CRIMINAL_HISTORY_CATEGORIES,
  buildCriminalHistoryRequest,
  productionCriminalHistoryWorkflow,
} from './criminal-history-production'

describe('production criminal history workflow', () => {
  it('builds a subject-centered request that separates event and disposition records', () => {
    const request = buildCriminalHistoryRequest({
      agency: 'Example Repository',
      personName: 'Example Subject',
      dateStart: '2020-01-01',
      dateEnd: '2026-01-01',
      accessBasis: 'Authorized request',
      subjectMatter: 'Repository entries and source references',
      categories: [
        'arrest-event-and-booking-history',
        'court-disposition-and-conviction-history',
        'source-agency-contributor-and-cross-reference-records',
      ],
    })

    expect(request.title).toContain('Example Subject')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('arrests')
    expect(request.items[1].description).toContain('Disposition and conviction entries')
    expect(request.items[2].format).toContain('structured format')
  })

  it('keeps the canonical workflow identity with a production contract', () => {
    expect(productionCriminalHistoryWorkflow.contractVersion).toBe(2)
    expect(productionCriminalHistoryWorkflow.manifest.id).toBe('criminal-history')
    expect(productionCriminalHistoryWorkflow.request.categories).toEqual(CRIMINAL_HISTORY_CATEGORIES)
    expect(productionCriminalHistoryWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing disposition and source records in a partial production', async () => {
    const request = buildCriminalHistoryRequest({
      agency: 'Example Repository',
      personName: 'Example Subject',
      dateStart: '2020-01-01',
      dateEnd: '2026-01-01',
      accessBasis: 'Authorized request',
      subjectMatter: 'Repository entries and source references',
      categories: [
        'arrest-event-and-booking-history',
        'court-disposition-and-conviction-history',
        'source-agency-contributor-and-cross-reference-records',
      ],
    })

    const analysis = await productionCriminalHistoryWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'event-history.pdf',
          category: 'arrest-event-and-booking-history',
          text: 'Event entry. Disposition and contributing-source records are referenced but not attached. Portions withheld.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('court-disposition-and-conviction-history')
    expect(analysis.missingCategoryIds).toContain('source-agency-contributor-and-cross-reference-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
