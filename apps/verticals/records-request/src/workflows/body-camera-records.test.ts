import { describe, expect, it } from 'vitest'
import {
  BODY_CAMERA_RECORD_CATEGORIES,
  bodyCameraRecordsWorkflow,
  buildBodyCameraRecordsRequest,
} from './body-camera-records'

describe('body camera records workflow', () => {
  it('builds a focused body-camera request with preservation and metadata scope', () => {
    const request = buildBodyCameraRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-08-15',
      timeStart: '14:10',
      timeEnd: '14:45',
      incidentNumber: '2026-00421',
      location: '100 Main St',
      officerNames: 'Officer A #123; Officer B #456',
      subjectMatter: 'traffic stop and vehicle search',
      categories: ['body-camera-recordings', 'body-camera-metadata', 'audit-and-access-logs'],
    })

    expect(request.title).toContain('2026-00421')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('body-worn camera recordings')
    expect(request.items[1].description).toContain('Native metadata')
    expect(request.items[2].description).toContain('Audit or access logs')
    expect(request.items[0].format).toContain('native digital video files')
  })

  it('declares the full records execution capability contract', () => {
    expect(bodyCameraRecordsWorkflow.contractVersion).toBe(2)
    expect(bodyCameraRecordsWorkflow.manifest.id).toBe('body-camera-records')
    expect(bodyCameraRecordsWorkflow.request.categories).toEqual(BODY_CAMERA_RECORD_CATEGORIES)
    expect(bodyCameraRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification',
      'extraction',
      'evidence',
      'research',
      'strategy',
      'validation',
      'review',
      'approval',
      'mailing',
      'tracking',
      'proofAudit',
    ]))
  })

  it('analyzes a partial production without requiring live LLM credentials', async () => {
    const request = buildBodyCameraRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-08-15',
      incidentNumber: '2026-00421',
      location: '100 Main St',
      subjectMatter: 'traffic stop',
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
