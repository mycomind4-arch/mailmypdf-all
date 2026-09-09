import { describe, expect, it } from 'vitest'
import { buildEducationRecordsRequest, EDUCATION_RECORD_CATEGORIES, productionEducationRecordsWorkflow } from './education-records-production'

describe('production education records workflow', () => {
  it('preserves the canonical id and production capability contract', () => {
    expect(productionEducationRecordsWorkflow.id).toBe('education-records')
    expect(productionEducationRecordsWorkflow.seo.canonicalPath).toBe('/workflows/education-records')
    expect(productionEducationRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionEducationRecordsWorkflow.capabilities).toContain('approval')
    expect(productionEducationRecordsWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds an authorization-aware request with separate education record classes', () => {
    const request = buildEducationRecordsRequest({
      agency: 'Example School District',
      studentName: 'Student Example',
      requesterCapacity: 'eligible student',
      studentId: 'STU-100',
      schoolProgram: 'Example High School',
      dateStart: '2024-08-01',
      dateEnd: '2026-06-30',
      subjectMatter: 'Obtain and reconcile the education record set',
    })
    expect(request.items).toHaveLength(EDUCATION_RECORD_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'transcripts-grades-credits-and-academic-history')).toBe(true)
    expect(request.items.some(item => item.category === 'consent-disclosure-and-record-access-history')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-unavailable-record-and-review-status')).toBe(true)
    expect(request.items.every(item => item.description.includes('Requester capacity: eligible student.'))).toBe(true)
  })

  it('does not request authentication secrets or assume protected records are public', () => {
    const request = buildEducationRecordsRequest({
      agency: 'Example University',
      studentName: 'Student Example',
      requesterCapacity: 'authorized representative',
      authorizationBasis: 'written student authorization',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      subjectMatter: 'Review an incomplete production',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('lawfully accessible')
    expect(corpus).toContain('Never request portal passwords')
    expect(corpus).not.toContain('provide password')
  })
})
