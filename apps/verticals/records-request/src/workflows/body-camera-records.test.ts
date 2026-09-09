import { describe, expect, it } from 'vitest'
import {
  BODY_CAMERA_RECORD_CATEGORIES,
  bodyCameraRecordsWorkflow,
  buildBodyCameraRecordsRequest,
} from './body-camera-records'

describe('body camera records workflow', () => {
  it('keeps canonical identity and moves the body-camera workflow to v2', () => {
    expect(bodyCameraRecordsWorkflow.id).toBe('body-camera-records')
    expect(bodyCameraRecordsWorkflow.seo.canonicalPath).toBe('/workflows/body-camera-records')
    expect(bodyCameraRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(bodyCameraRecordsWorkflow.contractVersion).toBe(2)
    expect(bodyCameraRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(bodyCameraRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(bodyCameraRecordsWorkflow.request.categories).toEqual(BODY_CAMERA_RECORD_CATEGORIES)
    expect(bodyCameraRecordsWorkflow.request.categories).toContain('request-status-and-release-records')
  })

  it('builds a focused body-camera request with media, metadata, preservation and release-status controls', () => {
    const request = buildBodyCameraRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example City, Example State',
      department: 'Digital Evidence Unit',
      incidentDate: '2026-08-15',
      timeStart: '14:10',
      timeEnd: '14:45',
      incidentNumber: '2026-00421',
      location: '100 Main St',
      person: 'Example Person',
      officerNames: 'Officer A #123; Officer B #456',
      subjectMatter: 'Traffic stop and disputed vehicle-search allegations.',
      requesterRelationship: 'involved party',
      preferredFormat: 'native video with metadata plus CSV/JSON logs where available',
      exclusions: 'exclude unrelated encounters on the same shift',
      categories: ['body-camera-recordings', 'body-camera-metadata', 'audit-and-access-logs', 'retention-and-deletion-records', 'request-status-and-release-records'],
    })

    expect(request.title).toContain('2026-00421')
    expect(request.jurisdiction).toBe('Example City, Example State')
    expect(request.items).toHaveLength(5)
    expect(request.items[0].description).toContain('body-worn camera recordings')
    expect(request.items[1].description).toContain('native metadata')
    expect(request.items[2].description).toContain('audit history')
    expect(request.items[3].description).toContain('retention classifications')
    expect(request.items[4].description).toContain('request/search status')
    expect(request.items[0].format).toContain('native video')
    expect(request.items[0].description).toContain('Scope exclusions/narrowing')
  })

  it('preserves privacy, legal-status and evidence-system security boundaries', () => {
    const request = buildBodyCameraRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example State',
      incidentDate: '2026-08-15',
      location: '100 Main St',
      subjectMatter: 'Disputed encounter.',
      categories: BODY_CAMERA_RECORD_CATEGORIES,
    })

    const corpus = request.items.map(item => item.description).join(' ').toLowerCase()
    expect(corpus).toContain('do not request passwords')
    expect(corpus).toContain('do not infer deletion, spoliation, misconduct, or a legal violation')
    expect(corpus).toContain('an allegation, arrest, citation, or officer narrative is not an adjudicated finding')
    expect(corpus).toContain('do not assume an unredacted version')
    expect(corpus).toContain("preserve the agency's stated basis rather than inventing")
  })

  it('requires agency, jurisdiction, location, incident date and encounter description', () => {
    const request = buildBodyCameraRecordsRequest({
      agency: '',
      incidentDate: '',
      location: '',
      subjectMatter: '',
    })
    expect(bodyCameraRecordsWorkflow.validateRequest({
      ...request,
      normalizedTitle: request.title,
      normalizedAgency: request.agency,
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'agency' }),
      expect.objectContaining({ field: 'jurisdiction' }),
      expect.objectContaining({ field: 'location' }),
      expect.objectContaining({ field: 'incidentDate' }),
      expect.objectContaining({ field: 'subjectMatter' }),
    ]))
  })

  it('analyzes a partial production without requiring live LLM credentials', async () => {
    const request = buildBodyCameraRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'Example State',
      incidentDate: '2026-08-15',
      incidentNumber: '2026-00421',
      location: '100 Main St',
      subjectMatter: 'Traffic stop',
      categories: ['body-camera-recordings', 'body-camera-metadata', 'dispatch-and-cad'],
    })

    const analysis = await bodyCameraRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      identifiers: { incidentNumber: '2026-00421', location: '100 Main St' },
      records: [
        {
          id: 'r1',
          filename: 'officer-a-bodycam.mp4',
          category: 'body-camera-recordings',
          text: 'Body camera recording for incident 2026-00421.',
        },
        {
          id: 'r2',
          filename: 'agency-response.pdf',
          text: 'See attached CAD record. Additional material was redacted.',
        },
      ],
    }) as {
      missingCategoryIds: string[]
      findings: Array<{ type: string }>
    }

    expect(analysis.missingCategoryIds).toContain('body-camera-metadata')
    expect(analysis.missingCategoryIds).toContain('dispatch-and-cad')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
