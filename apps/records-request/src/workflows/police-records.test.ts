import { describe, expect, it } from 'vitest'
import { buildPoliceRecordsRequest, policeRecordsWorkflow } from './police-records'

describe('police records workflow', () => {
  it('builds a targeted request around incident identifiers', () => {
    const request = buildPoliceRecordsRequest({
      agency: 'Example Police Department', incidentNumber: '2026-00123', location: '100 Main St',
      incidentDateStart: '2026-01-01', incidentDateEnd: '2026-01-31', subjectMatter: 'vehicle collision',
      categories: ['incident-report', 'dispatch-cad', 'body-camera'],
    })
    expect(request.title).toContain('2026-00123')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('incident/report number 2026-00123')
    expect(request.items[1].description).toContain('CAD')
    expect(request.items[2].format).toContain('native digital files')
  })

  it('exposes the complete domain-pack contract', () => {
    expect(policeRecordsWorkflow.id).toBe('police-records')
    expect(policeRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(policeRecordsWorkflow.request.categories.length).toBeGreaterThan(5)
  })

  it('rejects a request with no usable incident identifier', () => {
    const request = buildPoliceRecordsRequest({ agency:'Example PD', incidentDateStart:'2026-01-01', incidentDateEnd:'2026-01-31', subjectMatter:'incident' })
    expect(policeRecordsWorkflow.validateRequest({
      ...request,
      normalizedTitle: request.title,
      normalizedAgency: request.agency,
    })).toEqual(expect.arrayContaining([expect.objectContaining({ field:'identifiers' })]))
  })

  it('ignores unknown categories rather than allowing arbitrary request items', () => {
    const request = buildPoliceRecordsRequest({
      agency:'Example PD', incidentNumber:'2026-1', incidentDateStart:'2026-01-01', incidentDateEnd:'2026-01-31', subjectMatter:'incident',
      categories:['incident-report','unknown-category','unknown-system'],
    })
    expect(request.items.map((item) => item.category)).toEqual(['incident-report'])
  })
})
