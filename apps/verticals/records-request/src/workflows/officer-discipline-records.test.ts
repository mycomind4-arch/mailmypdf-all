import { describe, expect, it } from 'vitest'
import {
  OFFICER_DISCIPLINE_RECORD_CATEGORIES,
  buildOfficerDisciplineRecordsRequest,
  officerDisciplineRecordsWorkflow,
} from './officer-discipline-records'

describe('officer discipline records workflow', () => {
  it('builds a jurisdiction-sensitive officer discipline request', () => {
    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      badgeNumber: '123',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      state: 'California',
      conduct: 'dishonesty and unlawful search',
      categories: [
        'disciplinary-findings-and-final-outcomes',
        'certification-licensing-and-decertification-records',
        'disciplinary-indexes-and-case-tracking',
      ],
    })
    expect(request.title).toContain('Officer A')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Final disciplinary findings')
    expect(request.items[1].description).toContain('certification')
    expect(request.items[2].format).toContain('structured format')
  })

  it('declares the executable records capability contract', () => {
    expect(officerDisciplineRecordsWorkflow.contractVersion).toBe(2)
    expect(officerDisciplineRecordsWorkflow.manifest.id).toBe('officer-discipline-records')
    expect(officerDisciplineRecordsWorkflow.request.categories).toEqual(OFFICER_DISCIPLINE_RECORD_CATEGORIES)
    expect(officerDisciplineRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('detects an incomplete disciplinary production deterministically', async () => {
    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      categories: [
        'disciplinary-findings-and-final-outcomes',
        'certification-licensing-and-decertification-records',
        'disciplinary-indexes-and-case-tracking',
      ],
    })
    const analysis = await officerDisciplineRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'discipline.pdf',
          category: 'disciplinary-findings-and-final-outcomes',
          text: 'Final disciplinary finding for Officer A. Certification records were withheld and portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('certification-licensing-and-decertification-records')
    expect(analysis.missingCategoryIds).toContain('disciplinary-indexes-and-case-tracking')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
    ]))
  })
})
