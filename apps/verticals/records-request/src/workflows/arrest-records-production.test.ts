import { describe, expect, it } from 'vitest'
import {
  ARREST_RECORD_CATEGORIES,
  buildArrestRecordsRequest,
  productionArrestRecordsWorkflow,
} from './arrest-records-production'

describe('production arrest records workflow', () => {
  it('builds an arrest-specific booking and custody request', () => {
    const request = buildArrestRecordsRequest({
      agency: 'Example Sheriff',
      personName: 'Person A',
      arrestNumber: 'BK-2026-77',
      incidentNumber: 'INC-2026-55',
      arrestDate: '2026-09-01',
      subjectMatter: 'Arrest after a vehicle stop',
      categories: [
        'arrest-incident-and-supplemental-reports',
        'booking-intake-and-custody-records',
        'probable-cause-and-arrest-basis-records',
      ],
    })

    expect(request.title).toContain('BK-2026-77')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Arrest reports')
    expect(request.items[1].description).toContain('Booking and intake records')
    expect(request.items[2].description).toContain('Probable-cause declarations')
  })

  it('keeps the canonical arrest workflow identity while upgrading the contract', () => {
    expect(productionArrestRecordsWorkflow.contractVersion).toBe(2)
    expect(productionArrestRecordsWorkflow.manifest.id).toBe('arrest-records')
    expect(productionArrestRecordsWorkflow.manifest.intakeVersion).toBe('2.0.0')
    expect(productionArrestRecordsWorkflow.request.categories).toEqual(ARREST_RECORD_CATEGORIES)
    expect(productionArrestRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects missing booking and probable-cause records in a partial production', async () => {
    const request = buildArrestRecordsRequest({
      agency: 'Example Sheriff',
      personName: 'Person A',
      arrestNumber: 'BK-2026-77',
      arrestDate: '2026-09-01',
      subjectMatter: 'Arrest after a vehicle stop',
      categories: [
        'arrest-incident-and-supplemental-reports',
        'booking-intake-and-custody-records',
        'probable-cause-and-arrest-basis-records',
      ],
    })

    const analysis = await productionArrestRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'arrest-report.pdf',
          category: 'arrest-incident-and-supplemental-reports',
          text: 'Arrest report BK-2026-77. Booking records and probable cause declaration are referenced but not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('booking-intake-and-custody-records')
    expect(analysis.missingCategoryIds).toContain('probable-cause-and-arrest-basis-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
