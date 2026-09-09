import { describe, expect, it } from 'vitest'
import { USE_OF_FORCE_RECORD_CATEGORIES, buildUseOfForceRecordsRequest, useOfForceRecordsWorkflow } from './use-of-force-records'

describe('use of force records workflow', () => {
  it('builds an incident-centered force-record request', () => {
    const request=buildUseOfForceRecordsRequest({agency:'Example Police Department',incidentDate:'2026-08-22',incidentNumber:'2026-5521',location:'300 Pine St',officerNames:'Officer A #123',person:'Example Person',forceDescription:'takedown and handcuff restraint',categories:['use-of-force-reports','body-camera-recordings','supervisor-review-and-approval']})
    expect(request.title).toContain('2026-5521')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('Use-of-force reports')
    expect(request.items[1].description).toContain('Body-worn camera recordings')
    expect(request.items[2].description).toContain('Supervisor reviews')
  })

  it('declares the executable records capability contract', () => {
    expect(useOfForceRecordsWorkflow.contractVersion).toBe(2)
    expect(useOfForceRecordsWorkflow.manifest.id).toBe('use-of-force-records')
    expect(useOfForceRecordsWorkflow.request.categories).toEqual(USE_OF_FORCE_RECORD_CATEGORIES)
    expect(useOfForceRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })

  it('flags omitted force records and media in a partial production', async () => {
    const request=buildUseOfForceRecordsRequest({agency:'Example Police Department',incidentDate:'2026-08-22',incidentNumber:'2026-5521',location:'300 Pine St',forceDescription:'takedown',categories:['use-of-force-reports','body-camera-recordings','supervisor-review-and-approval']})
    const analysis=await useOfForceRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,identifiers:{incidentNumber:'2026-5521',location:'300 Pine St'},records:[{id:'r1',filename:'force-report.pdf',category:'use-of-force-reports',text:'Use of force report for incident number 2026-5521.'},{id:'r2',filename:'response.pdf',text:'See body-worn camera evidence. Supervisor review was withheld and portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('body-camera-recordings')
    expect(analysis.missingCategoryIds).toContain('supervisor-review-and-approval')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
