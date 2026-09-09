import { describe, expect, it } from 'vitest'
import {
  POLICE_PURSUIT_RECORD_CATEGORIES,
  buildPolicePursuitRecordsRequest,
  policePursuitRecordsWorkflow,
} from './police-pursuit-records'

describe('police pursuit records workflow', () => {
  it('builds a pursuit-centered request with telematics and review records', () => {
    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      incidentNumber: 'P-2026-44',
      startLocation: 'Main St and 1st Ave',
      endLocation: 'Highway 10 mile 22',
      eventDescription: 'Vehicle pursuit ending in a collision and arrest',
      categories: [
        'pursuit-and-incident-reports',
        'gps-avl-and-vehicle-telematics',
        'supervisor-and-pursuit-review-records',
      ],
    })

    expect(request.title).toContain('P-2026-44')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Vehicle-pursuit reports')
    expect(request.items[1].description).toContain('GPS')
    expect(request.items[1].format).toContain('structured format')
    expect(request.items[2].description).toContain('Supervisor review')
  })

  it('declares the executable records capability contract', () => {
    expect(policePursuitRecordsWorkflow.contractVersion).toBe(2)
    expect(policePursuitRecordsWorkflow.manifest.id).toBe('police-pursuit-records')
    expect(policePursuitRecordsWorkflow.request.categories).toEqual(POLICE_PURSUIT_RECORD_CATEGORIES)
    expect(policePursuitRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('flags missing telemetry and review records in a partial production', async () => {
    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      incidentNumber: 'P-2026-44',
      startLocation: 'Main St and 1st Ave',
      eventDescription: 'Vehicle pursuit ending in a collision',
      categories: [
        'pursuit-and-incident-reports',
        'gps-avl-and-vehicle-telematics',
        'supervisor-and-pursuit-review-records',
      ],
    })

    const analysis = await policePursuitRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'pursuit-report.pdf',
          category: 'pursuit-and-incident-reports',
          text: 'Pursuit P-2026-44 report. GPS data and supervisor review are referenced but were not included. Portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('gps-avl-and-vehicle-telematics')
    expect(analysis.missingCategoryIds).toContain('supervisor-and-pursuit-review-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
