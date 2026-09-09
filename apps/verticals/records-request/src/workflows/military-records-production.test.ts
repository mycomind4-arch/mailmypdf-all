import { describe, expect, it } from 'vitest'
import { buildMilitaryRecordsRequest, MILITARY_RECORD_CATEGORIES, productionMilitaryRecordsWorkflow } from './military-records-production'

describe('production military records workflow', () => {
  it('preserves the canonical id and production capability contract', () => {
    expect(productionMilitaryRecordsWorkflow.id).toBe('military-records')
    expect(productionMilitaryRecordsWorkflow.seo.canonicalPath).toBe('/workflows/military-records')
    expect(productionMilitaryRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(productionMilitaryRecordsWorkflow.capabilities).toContain('approval')
    expect(productionMilitaryRecordsWorkflow.capabilities).toContain('proofAudit')
  })

  it('builds an eligibility-aware request with separate military record classes', () => {
    const request = buildMilitaryRecordsRequest({
      agency: 'Example Military Records Center',
      serviceMemberName: 'Veteran Example',
      requesterCapacity: 'veteran',
      branch: 'Example Service',
      unitOrAssignment: 'Example Unit',
      dateStart: '2010-01-01',
      dateEnd: '2020-01-01',
      subjectMatter: 'Obtain and reconcile the service record set',
    })
    expect(request.items).toHaveLength(MILITARY_RECORD_CATEGORIES.length)
    expect(request.items.some(item => item.category === 'separation-discharge-and-dd214-equivalent-records')).toBe(true)
    expect(request.items.some(item => item.category === 'correction-amendment-and-board-review-status')).toBe(true)
    expect(request.items.some(item => item.category === 'withholding-unavailable-record-and-review-status')).toBe(true)
    expect(request.items.every(item => item.description.includes('Requester capacity: veteran.'))).toBe(true)
  })

  it('does not request credentials or assume sensitive military material is public', () => {
    const request = buildMilitaryRecordsRequest({
      agency: 'Example Military Records Center',
      serviceMemberName: 'Veteran Example',
      requesterCapacity: 'authorized representative',
      authorizationBasis: 'written authorization',
      dateStart: '2018-01-01',
      dateEnd: '2020-01-01',
      subjectMatter: 'Review an incomplete production',
    })
    const corpus = request.items.map(item => item.description).join(' ')
    expect(corpus).toContain('lawfully accessible')
    expect(corpus).toContain('Do not request current sensitive operational locations')
    expect(corpus).not.toContain('provide password')
  })
})
