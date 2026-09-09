import { describe, expect, it } from 'vitest'
import {
  CRIMINAL_RECORD_CATEGORIES,
  buildCriminalRecordsRequest,
  productionCriminalRecordsWorkflow,
} from './criminal-records-production'

describe('production criminal records workflow', () => {
  it('builds a case-centered docket and disposition request', () => {
    const request = buildCriminalRecordsRequest({
      agency: 'Example Superior Court',
      caseNumber: 'CR-2026-99',
      personName: 'Person A',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Felony criminal case records',
      categories: [
        'docket-register-and-case-index',
        'complaint-information-indictment-and-charging-records',
        'judgment-sentencing-and-disposition-records',
      ],
    })

    expect(request.title).toContain('CR-2026-99')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Docket sheets')
    expect(request.items[0].format).toContain('structured format')
    expect(request.items[1].description).toContain('Criminal complaints')
    expect(request.items[2].description).toContain('Judgments')
  })

  it('keeps the canonical criminal-records identity with a production contract', () => {
    expect(productionCriminalRecordsWorkflow.contractVersion).toBe(2)
    expect(productionCriminalRecordsWorkflow.manifest.id).toBe('criminal-records')
    expect(productionCriminalRecordsWorkflow.request.categories).toEqual(CRIMINAL_RECORD_CATEGORIES)
    expect(productionCriminalRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing charging and disposition records in a partial production', async () => {
    const request = buildCriminalRecordsRequest({
      agency: 'Example Superior Court',
      caseNumber: 'CR-2026-99',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      subjectMatter: 'Felony criminal case records',
      categories: [
        'docket-register-and-case-index',
        'complaint-information-indictment-and-charging-records',
        'judgment-sentencing-and-disposition-records',
      ],
    })

    const analysis = await productionCriminalRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'docket.pdf',
          category: 'docket-register-and-case-index',
          text: 'Docket for CR-2026-99. Charging document is attached and judgment is referenced but not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('complaint-information-indictment-and-charging-records')
    expect(analysis.missingCategoryIds).toContain('judgment-sentencing-and-disposition-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
