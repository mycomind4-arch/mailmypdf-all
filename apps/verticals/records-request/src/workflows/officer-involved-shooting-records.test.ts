import { describe, expect, it } from 'vitest'
import {
  OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES,
  buildOfficerInvolvedShootingRecordsRequest,
  officerInvolvedShootingRecordsWorkflow,
} from './officer-involved-shooting-records'

describe('officer involved shooting records workflow', () => {
  it('builds a critical-incident request with firearm and external review records', () => {
    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      incidentNumber: 'OIS-2026-4',
      location: '100 Main Street',
      officerNames: 'Officer A #123',
      externalAgency: 'Example District Attorney',
      eventDescription: 'Officer firearm discharge during an arrest encounter',
      categories: [
        'critical-incident-and-shooting-reports',
        'officer-weapon-and-firearm-discharge-records',
        'prosecutor-or-external-review-records',
      ],
    })

    expect(request.title).toContain('OIS-2026-4')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Officer-involved-shooting')
    expect(request.items[1].description).toContain('Firearm-discharge reports')
    expect(request.items[2].description).toContain('Final public reports')
  })

  it('declares the executable records capability contract', () => {
    expect(officerInvolvedShootingRecordsWorkflow.contractVersion).toBe(2)
    expect(officerInvolvedShootingRecordsWorkflow.manifest.id).toBe('officer-involved-shooting-records')
    expect(officerInvolvedShootingRecordsWorkflow.request.categories).toEqual(OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES)
    expect(officerInvolvedShootingRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('flags missing firearm and outside-review records in a partial production', async () => {
    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      incidentNumber: 'OIS-2026-4',
      location: '100 Main Street',
      eventDescription: 'Officer firearm discharge',
      categories: [
        'critical-incident-and-shooting-reports',
        'officer-weapon-and-firearm-discharge-records',
        'prosecutor-or-external-review-records',
      ],
    })

    const analysis = await officerInvolvedShootingRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'critical-incident.pdf',
          category: 'critical-incident-and-shooting-reports',
          text: 'Critical incident OIS-2026-4. Firearm discharge report and prosecutor review are referenced but not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('officer-weapon-and-firearm-discharge-records')
    expect(analysis.missingCategoryIds).toContain('prosecutor-or-external-review-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
