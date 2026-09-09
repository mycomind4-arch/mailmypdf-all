import { describe, expect, it } from 'vitest'
import { INTERNAL_AFFAIRS_RECORD_CATEGORIES, buildInternalAffairsRecordsRequest, internalAffairsRecordsWorkflow } from './internal-affairs-records'

describe('internal affairs records workflow', () => {
  it('builds a complaint-centered professional standards request', () => {
    const request=buildInternalAffairsRecordsRequest({agency:'Example Police Department',complaintNumber:'IA-2026-101',incidentNumber:'2026-5511',dateStart:'2026-01-01',dateEnd:'2026-09-01',officerNames:'Officer A #123',allegation:'unlawful search and inaccurate reporting',categories:['complaint-intake-and-tracking','evidence-and-media-indexes','findings-and-disposition-records']})
    expect(request.title).toContain('IA-2026-101')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Complaint intake records')
    expect(request.items[1].description).toContain('Evidence inventories')
    expect(request.items[2].description).toContain('Findings')
  })

  it('declares the executable records capability contract', () => {
    expect(internalAffairsRecordsWorkflow.contractVersion).toBe(2)
    expect(internalAffairsRecordsWorkflow.manifest.id).toBe('internal-affairs-records')
    expect(internalAffairsRecordsWorkflow.request.categories).toEqual(INTERNAL_AFFAIRS_RECORD_CATEGORIES)
    expect(internalAffairsRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })

  it('flags missing findings and evidence indexes in a partial production', async () => {
    const request=buildInternalAffairsRecordsRequest({agency:'Example Police Department',complaintNumber:'IA-2026-101',dateStart:'2026-01-01',dateEnd:'2026-09-01',officerNames:'Officer A #123',allegation:'unlawful search',categories:['complaint-intake-and-tracking','evidence-and-media-indexes','findings-and-disposition-records']})
    const analysis=await internalAffairsRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'complaint.pdf',category:'complaint-intake-and-tracking',text:'Complaint IA-2026-101 intake record.'},{id:'r2',filename:'response.pdf',text:'See evidence index. Findings were withheld and portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('evidence-and-media-indexes')
    expect(analysis.missingCategoryIds).toContain('findings-and-disposition-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
