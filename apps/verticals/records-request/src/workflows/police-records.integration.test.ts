import { describe, expect, it } from 'vitest'
import { buildPoliceRecordsRequest, policeRecordsWorkflow } from './police-records'

describe('police records flagship integration', () => {
  it('builds a request and analyzes a representative production', async () => {
    const request = buildPoliceRecordsRequest({
      agency:'Example Police Department',
      incidentNumber:'2026-00123',
      location:'100 Main St',
      incidentDateStart:'2026-01-01',
      incidentDateEnd:'2026-01-31',
      subjectMatter:'vehicle collision',
      categories:['incident-report','dispatch-cad','body-camera'],
    })

    const analysis = await policeRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems:request.items,
      identifiers:{ incidentNumber:'2026-00123', location:'100 Main St' },
      records:[
        { id:'r1', filename:'incident-report.pdf', category:'incident-report', text:'Incident report number 2026-00123' },
        { id:'r2', filename:'response.pdf', text:'See attached CAD record. Portions are redacted.' },
      ],
    }) as { missingCategoryIds:string[]; findings:Array<{type:string}> }

    expect(analysis.missingCategoryIds).toContain('body-camera')
    expect(analysis.missingCategoryIds).toContain('dispatch-cad')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type:'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type:'REFERENCED_RECORD_NOT_PRODUCED' }),
      expect.objectContaining({ type:'REDACTION_REVIEW' }),
    ]))
  })
})
