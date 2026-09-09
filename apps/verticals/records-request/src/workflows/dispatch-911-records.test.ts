import { describe, expect, it } from 'vitest'
import {
  DISPATCH_911_RECORD_CATEGORIES,
  buildDispatch911RecordsRequest,
  dispatch911RecordsWorkflow,
} from './dispatch-911-records'

describe('911 call and dispatch records workflow', () => {
  it('builds audio, CAD, radio, and response-history scope', () => {
    const request = buildDispatch911RecordsRequest({
      agency: 'Example Emergency Communications Center',
      incidentDate: '2026-08-20',
      timeStart: '21:05',
      timeEnd: '21:40',
      incidentNumber: 'CAD-2026-9912',
      location: '200 Oak St',
      subjectMatter: 'reported disturbance and police response',
      categories: ['911-call-audio', 'cad-event-history', 'dispatch-radio-audio'],
    })

    expect(request.title).toContain('CAD-2026-9912')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Audio recordings')
    expect(request.items[1].description).toContain('Complete CAD')
    expect(request.items[2].description).toContain('dispatch and radio traffic')
    expect(request.items[0].format).toContain('native digital audio files')
  })

  it('registers the full execution capability contract', () => {
    expect(dispatch911RecordsWorkflow.contractVersion).toBe(2)
    expect(dispatch911RecordsWorkflow.manifest.id).toBe('dispatch-911-records')
    expect(dispatch911RecordsWorkflow.request.categories).toEqual(DISPATCH_911_RECORD_CATEGORIES)
    expect(dispatch911RecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'evidence', 'research', 'strategy', 'validation',
      'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('finds missing dispatch records in a partial production without live LLMs', async () => {
    const request = buildDispatch911RecordsRequest({
      agency: 'Example Emergency Communications Center',
      incidentDate: '2026-08-20',
      incidentNumber: 'CAD-2026-9912',
      location: '200 Oak St',
      subjectMatter: 'reported disturbance',
      categories: ['911-call-audio', 'cad-event-history', 'dispatch-radio-audio'],
    })

    const analysis = await dispatch911RecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      identifiers: { incidentNumber: 'CAD-2026-9912', location: '200 Oak St' },
      records: [
        { id: 'r1', filename: '911-call.wav', category: '911-call-audio', text: '911 call recording for CAD number CAD-2026-9912.' },
        { id: 'r2', filename: 'response.pdf', text: 'See attached CAD event. Radio traffic was withheld and portions were redacted.' },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('cad-event-history')
    expect(analysis.missingCategoryIds).toContain('dispatch-radio-audio')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
