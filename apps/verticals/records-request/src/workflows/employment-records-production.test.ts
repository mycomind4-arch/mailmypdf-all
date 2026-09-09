import { describe, expect, it } from 'vitest'
import { buildEmploymentRecordsRequest, EMPLOYMENT_RECORD_CATEGORIES, productionEmploymentRecordsWorkflow } from './employment-records-production'

describe('production employment records workflow', () => {
  it('preserves the canonical id and production capability contract', () => {
    expect(productionEmploymentRecordsWorkflow.id).toBe('employment-records')
    expect(productionEmploymentRecordsWorkflow.seo.canonicalPath).toBe('/workflows/employment-records')
    expect(productionEmploymentRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionEmploymentRecordsWorkflow.capabilities).toContain('approval')
    expect(productionEmploymentRecordsWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds an authorization-aware request with separate employment record classes', () => {
    const request = buildEmploymentRecordsRequest({
      agency: 'Example Employer',
      employeeName: 'Employee Example',
      requesterCapacity: 'former employee',
      employeeId: 'EMP-100',
      positionOrUnit: 'Operations',
      dateStart: '2022-01-01',
      dateEnd: '2026-01-01',
      subjectMatter: 'Obtain and reconcile the personnel record set',
    })
    expect(request.items).toHaveLength(EMPLOYMENT_RECORD_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'compensation-payroll-earnings-and-deduction-records')).toBe(true)
    expect(request.items.some(item => item.category === 'discipline-investigation-grievance-and-resolution-records')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-unavailable-record-and-review-status')).toBe(true)
    expect(request.items.every(item => item.description.includes('Requester capacity: former employee.'))).toBe(true)
  })

  it('does not request credentials or assume another employee personnel data is available', () => {
    const request = buildEmploymentRecordsRequest({
      agency: 'Example Employer',
      employeeName: 'Employee Example',
      requesterCapacity: 'authorized representative',
      authorizationBasis: 'written employee authorization',
      dateStart: '2025-01-01',
      dateEnd: '2026-01-01',
      subjectMatter: 'Review an incomplete employment-record production',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('lawfully accessible')
    expect(corpus).toContain('Never request passwords')
    expect(corpus).not.toContain('provide password')
  })
})
