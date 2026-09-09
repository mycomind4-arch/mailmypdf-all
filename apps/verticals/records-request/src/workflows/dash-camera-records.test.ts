import { describe, expect, it } from 'vitest'
import { DASH_CAMERA_RECORD_CATEGORIES, buildDashCameraRecordsRequest, dashCameraRecordsWorkflow } from './dash-camera-records'

describe('dash camera records workflow', () => {
  it('builds an incident-specific in-car video request', () => {
    const request=buildDashCameraRecordsRequest({agency:'Example Highway Patrol',incidentDate:'2026-08-25',incidentNumber:'2026-7712',location:'Highway 1 at Main St',vehicle:'ABC123',officerNames:'Officer A #123',subjectMatter:'traffic stop and roadside search',categories:['dash-camera-recordings','dash-camera-metadata','vehicle-and-unit-assignment-records']})
    expect(request.title).toContain('2026-7712')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('in-car')
    expect(request.items[1].description).toContain('Native metadata')
    expect(request.items[2].description).toContain('Patrol vehicle')
    expect(request.items[0].format).toContain('native digital video files')
  })

  it('declares the executable records capability contract', () => {
    expect(dashCameraRecordsWorkflow.contractVersion).toBe(2)
    expect(dashCameraRecordsWorkflow.manifest.id).toBe('dash-camera-records')
    expect(dashCameraRecordsWorkflow.request.categories).toEqual(DASH_CAMERA_RECORD_CATEGORIES)
    expect(dashCameraRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })

  it('flags omitted in-car media and metadata in a partial production', async () => {
    const request=buildDashCameraRecordsRequest({agency:'Example Highway Patrol',incidentDate:'2026-08-25',incidentNumber:'2026-7712',location:'Highway 1 at Main St',subjectMatter:'traffic stop',categories:['dash-camera-recordings','dash-camera-metadata','dispatch-and-cad']})
    const analysis=await dashCameraRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,identifiers:{incidentNumber:'2026-7712',location:'Highway 1 at Main St'},records:[{id:'r1',filename:'cad.pdf',category:'dispatch-and-cad',text:'CAD record for incident number 2026-7712.'},{id:'r2',filename:'response.pdf',text:'See in-car video. Portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('dash-camera-recordings')
    expect(analysis.missingCategoryIds).toContain('dash-camera-metadata')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
