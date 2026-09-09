import { describe, expect, it } from 'vitest'
import { buildCaseRecordsProductionRequest, CASE_RECORDS_PRODUCTION_CATEGORIES, productionCaseRecordsWorkflow } from './case-records-production'

describe('production case records workflow', () => {
  it('keeps canonical identity and moves case records to v2', () => {
    expect(productionCaseRecordsWorkflow.id).toBe('case-records')
    expect(productionCaseRecordsWorkflow.seo.canonicalPath).toBe('/workflows/case-records')
    expect(productionCaseRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionCaseRecordsWorkflow.capabilities).toContain('approval')
    expect(productionCaseRecordsWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a cross-referenced case scope with evidence, service and status controls', () => {
    const request = buildCaseRecordsProductionRequest({
      agency: 'Example Enforcement Agency',
      jurisdiction: 'Example County, Example State',
      caseNumber: 'CE-2026-44',
      relatedIdentifiers: 'Parcel 100-200-300; permit P-22',
      personName: 'Example Respondent',
      address: '100 Example Road',
      subjectMatter: 'Agency case concerning disputed property allegations and related enforcement activity.',
      dateStart: '2025-01-01',
      dateEnd: '2026-09-01',
      departments: 'Planning and Sheriff records units',
      custodians: 'assigned inspector, supervisor, records unit',
      searchTerms: 'CE-2026-44 100 Example Road P-22',
      preferredFormat: 'native electronic files and original media where available',
      knownCaseStatus: 'open according to requester',
    })
    expect(request.items).toHaveLength(CASE_RECORDS_PRODUCTION_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'initiating-complaints-referrals-intake-and-source-records')).toBe(true)
    expect(request.items.some(item => item.category === 'evidence-exhibits-photographs-video-audio-and-media')).toBe(true)
    expect(request.items.some(item => item.category === 'service-mailing-delivery-and-notice-proof-records')).toBe(true)
    expect(request.items.some(item => item.category === 'cross-agency-department-referral-and-coordination-records')).toBe(true)
  })

  it('preserves allegation and finding status instead of asserting disputed claims as facts', () => {
    const request = buildCaseRecordsProductionRequest({
      agency: 'Example Agency',
      jurisdiction: 'Example State',
      caseNumber: 'CASE-1',
      subjectMatter: 'Disputed complaint and alleged violation.',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('do not convert disputed or unadjudicated allegations into established facts')
    expect(corpus).toContain('alleged, noticed, found, admitted, adjudicated, withdrawn, dismissed, corrected')
    expect(corpus).not.toContain('provide password')
  })
})
