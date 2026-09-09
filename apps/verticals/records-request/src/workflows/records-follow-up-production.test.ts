import { describe, expect, it } from 'vitest'
import { buildRecordsFollowUpRequest, productionRecordsFollowUpWorkflow, RECORDS_FOLLOW_UP_CATEGORIES } from './records-follow-up-production'

describe('production records follow-up workflow', () => {
  it('preserves canonical identity and full production capabilities', () => {
    expect(productionRecordsFollowUpWorkflow.id).toBe('records-follow-up')
    expect(productionRecordsFollowUpWorkflow.seo.canonicalPath).toBe('/workflows/records-follow-up')
    expect(productionRecordsFollowUpWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionRecordsFollowUpWorkflow.capabilities).toContain('deadline')
    expect(productionRecordsFollowUpWorkflow.capabilities).toContain('approval')
    expect(productionRecordsFollowUpWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds a scope-preserving follow-up across response and production status classes', () => {
    const request = buildRecordsFollowUpRequest({
      agency: 'Example Records Office',
      jurisdiction: 'Example jurisdiction',
      originalRequestDate: '2026-08-01',
      originalRequestNumber: 'REQ-100',
      originalScopeSummary: 'Incident report, dispatch log, and referenced attachments for the identified incident.',
      responseStatus: 'partial production',
      lastAgencyContactDate: '2026-08-20',
      producedCategories: 'incident report',
      missingCategories: 'dispatch log and referenced attachments',
      subjectMatter: 'Confirm the status of the unresolved original categories',
    })
    expect(request.items).toHaveLength(RECORDS_FOLLOW_UP_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'production-inventory-and-missing-categories')).toBe(true)
    expect(request.items.some(item => item.category === 'referenced-but-unproduced-records')).toBe(true)
    expect(request.items.some(item => item.category === 'deadline-and-response-timeline')).toBe(true)
    expect(request.items[0]?.description).toContain('Original scope: Incident report, dispatch log, and referenced attachments')
  })

  it('does not invent agency promises or legal deadlines', () => {
    const request = buildRecordsFollowUpRequest({
      agency: 'Example Records Office',
      originalRequestDate: '2026-08-01',
      originalScopeSummary: 'The original request as submitted.',
      responseStatus: 'acknowledgment received',
      subjectMatter: 'Ask for current status',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('Do not invent a promised date')
    expect(corpus).toContain('Do not calculate or assert a legal deadline')
    expect(corpus).toContain('Do not invent legal authority')
  })
})
