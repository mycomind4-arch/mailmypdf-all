import { describe, expect, it } from 'vitest'
import { buildPoliceRecordsRequest, POLICE_RECORD_CATEGORIES, policeRecordsWorkflow } from './police-records'

describe('police records workflow', () => {
  it('keeps canonical identity and moves the broad police front door to v2', () => {
    expect(policeRecordsWorkflow.id).toBe('police-records')
    expect(policeRecordsWorkflow.seo.canonicalPath).toBe('/workflows/police-records')
    expect(policeRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(policeRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(policeRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(policeRecordsWorkflow.request.categories).toContain('withholding-redaction-no-records-and-request-status')
  })

  it('builds an incident-centered request while preserving old category ids and adding completeness controls', () => {
    const request = buildPoliceRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example City, Example State',
      department: 'Records and Investigations',
      incidentNumber: '2026-00123',
      arrestNumber: 'BK-44',
      location: '100 Main St',
      person: 'Example Person',
      vehicle: 'EXAMPLE-PLATE',
      incidentDateStart: '2026-01-01',
      incidentDateEnd: '2026-01-31',
      subjectMatter: 'Reported vehicle collision with disputed statements about responsibility.',
      requesterRelationship: 'involved party',
      preferredFormat: 'native media and PDF reports where available',
      exclusions: 'exclude unrelated incidents involving similarly named people',
      categories: ['incident-report', 'dispatch-cad', 'body-camera', 'evidence-and-property-records', 'withholding-redaction-no-records-and-request-status'],
    })

    expect(request.title).toContain('2026-00123')
    expect(request.jurisdiction).toBe('Example City, Example State')
    expect(request.items).toHaveLength(5)
    expect(request.items[0].description).toContain('incident/report/CAD identifier 2026-00123')
    expect(request.items.find(item => item.category === 'dispatch-cad')?.description).toContain('computer-aided dispatch')
    expect(request.items.find(item => item.category === 'body-camera')?.format).toContain('native media')
    expect(request.items.find(item => item.category === 'withholding-redaction-no-records-and-request-status')?.description).toContain("Preserve the agency's stated basis rather than inventing")
  })

  it('preserves allegations, arrests and police narratives as record states rather than adjudicated facts', () => {
    const request = buildPoliceRecordsRequest({
      agency: 'Example PD',
      jurisdiction: 'Example State',
      incidentNumber: 'INC-1',
      incidentDateStart: '2026-01-01',
      incidentDateEnd: '2026-01-31',
      subjectMatter: 'Disputed allegation in an incident report.',
    })

    const corpus = request.items.map(item => item.description).join(' ').toLowerCase()
    expect(corpus).toContain('do not convert police-record content into an established fact')
    expect(corpus).toContain('an arrest, citation, accusation, or booking record is not proof of guilt or adjudication')
    expect(corpus).toContain('do not request credentials')
    expect(corpus).toContain('do not assume protected caller')
  })

  it('requires jurisdiction and a usable event identifier', () => {
    const request = buildPoliceRecordsRequest({
      agency:'Example PD',
      incidentDateStart:'2026-01-01',
      incidentDateEnd:'2026-01-31',
      subjectMatter:'incident',
    })
    expect(policeRecordsWorkflow.validateRequest({
      ...request,
      normalizedTitle: request.title,
      normalizedAgency: request.agency,
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ field:'jurisdiction' }),
      expect.objectContaining({ field:'identifiers' }),
    ]))
  })

  it('retains established category ids and ignores arbitrary request items', () => {
    expect(POLICE_RECORD_CATEGORIES).toContain('incident-report')
    expect(POLICE_RECORD_CATEGORIES).toContain('body-camera')
    expect(POLICE_RECORD_CATEGORIES).toContain('911-calls')
    const request = buildPoliceRecordsRequest({
      agency:'Example PD',
      jurisdiction:'Example State',
      incidentNumber:'2026-1',
      incidentDateStart:'2026-01-01',
      incidentDateEnd:'2026-01-31',
      subjectMatter:'incident',
      categories:['incident-report','unknown-category','unknown-system'],
    })
    expect(request.items.map(item => item.category)).toEqual(['incident-report'])
  })
})
