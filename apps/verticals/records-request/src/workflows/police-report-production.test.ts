import { describe, expect, it } from 'vitest'
import { buildPoliceReportProductionRequest, POLICE_REPORT_PRODUCTION_CATEGORIES, productionPoliceReportWorkflow } from './police-report-production'

describe('production police report workflow', () => {
  it('keeps canonical identity and moves police report to v2', () => {
    expect(productionPoliceReportWorkflow.id).toBe('police-report')
    expect(productionPoliceReportWorkflow.seo.canonicalPath).toBe('/workflows/police-report')
    expect(productionPoliceReportWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionPoliceReportWorkflow.capabilities).toContain('approval')
  })

  it('builds a specific report scope with supplements, media, revision and release controls', () => {
    const request = buildPoliceReportProductionRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example City, Example State',
      reportNumber: 'PD-26-1234',
      incidentDate: '2026-08-01',
      location: '100 Example Street',
      personName: 'Example Person',
      requesterRelationship: 'involved party',
      reportType: 'incident report',
      otherIdentifiers: 'citation C-9; property P-3',
      dateStart: '2026-08-01',
      dateEnd: '2026-09-01',
      preferredFormat: 'PDF plus original media where available',
      officialCopyPreference: 'ordinary copy; official copy if actually available',
      subjectMatter: 'Reported incident with disputed allegations.',
    })
    expect(request.items).toHaveLength(POLICE_REPORT_PRODUCTION_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'supplemental-follow-up-and-amended-reports')).toBe(true)
    expect(request.items.some(item => item.category === 'diagrams-photographs-audio-video-and-report-attachments')).toBe(true)
    expect(request.items.some(item => item.category === 'review-approval-correction-revision-and-report-history')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-redaction-no-records-and-request-status')).toBe(true)
  })

  it('does not turn police allegations, arrests or citations into adjudicated facts', () => {
    const request = buildPoliceReportProductionRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example State',
      reportNumber: 'R-1',
      incidentDate: '2026-08-01',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-02',
      subjectMatter: 'Disputed incident allegations.',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('do not convert a report narrative into an established legal fact')
    expect(corpus).toContain('does not establish guilt, liability, ownership, or final disposition')
    expect(corpus).not.toContain('provide password')
  })
})
