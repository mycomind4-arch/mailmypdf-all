import { describe, expect, it } from 'vitest'
import { DASH_CAMERA_RECORD_CATEGORIES, buildDashCameraRecordsRequest, dashCameraRecordsWorkflow } from './dash-camera-records'

describe('dash camera records workflow', () => {
  it('keeps canonical identity and moves dash-camera records to v2', () => {
    expect(dashCameraRecordsWorkflow.id).toBe('dash-camera-records')
    expect(dashCameraRecordsWorkflow.seo.canonicalPath).toBe('/workflows/dash-camera-records')
    expect(dashCameraRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(dashCameraRecordsWorkflow.contractVersion).toBe(2)
    expect(dashCameraRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(dashCameraRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(dashCameraRecordsWorkflow.request.categories).toEqual(DASH_CAMERA_RECORD_CATEGORIES)
    expect(dashCameraRecordsWorkflow.request.categories).toContain('request-status-and-release-records')
  })

  it('builds an incident-specific request with media, metadata, assignments and status evidence', () => {
    const request=buildDashCameraRecordsRequest({
      agency:'Example Highway Patrol',
      jurisdiction:'Example State',
      department:'Digital Evidence and Fleet',
      incidentDate:'2026-08-25',
      timeStart:'21:10',
      timeEnd:'21:45',
      incidentNumber:'2026-7712',
      location:'Highway 1 at Main St',
      vehicle:'ABC123 / Unit 42',
      officerNames:'Officer A #123',
      subjectMatter:'Traffic stop and disputed roadside-search allegations.',
      requesterRelationship:'involved party',
      preferredFormat:'native video with metadata plus CSV/JSON logs where available',
      exclusions:'exclude unrelated location history before or after the event',
      categories:['dash-camera-recordings','dash-camera-metadata','vehicle-and-unit-assignment-records','retention-and-deletion-records','request-status-and-release-records'],
    })
    expect(request.title).toContain('2026-7712')
    expect(request.jurisdiction).toBe('Example State')
    expect(request.items).toHaveLength(5)
    expect(request.items[0].description).toContain('in-car')
    expect(request.items[1].description).toContain('native metadata')
    expect(request.items[2].description).toContain('patrol vehicle')
    expect(request.items[3].description).toContain('retention classifications')
    expect(request.items[4].description).toContain('request/search status')
    expect(request.items[0].format).toContain('native video')
    expect(request.items[0].description).toContain('Scope exclusions/narrowing')
  })

  it('preserves legal-status, location-privacy and evidence-system security boundaries', () => {
    const request=buildDashCameraRecordsRequest({
      agency:'Example Highway Patrol',
      jurisdiction:'Example State',
      incidentDate:'2026-08-25',
      location:'Highway 1 at Main St',
      subjectMatter:'Disputed traffic-stop allegations.',
      categories:DASH_CAMERA_RECORD_CATEGORIES,
    })
    const corpus=request.items.map(item=>item.description).join(' ').toLowerCase()
    expect(corpus).toContain('do not request passwords')
    expect(corpus).toContain('do not infer deletion, spoliation, misconduct, or a legal violation')
    expect(corpus).toContain('an allegation, arrest, citation, charge, or officer narrative is not an adjudicated finding')
    expect(corpus).toContain('unrelated location history')
    expect(corpus).toContain("preserve the agency's stated basis rather than inventing")
  })

  it('requires agency, jurisdiction, location, incident date and event description', () => {
    const request=buildDashCameraRecordsRequest({agency:'',incidentDate:'',location:'',subjectMatter:''})
    expect(dashCameraRecordsWorkflow.validateRequest({...request,normalizedTitle:request.title,normalizedAgency:request.agency})).toEqual(expect.arrayContaining([
      expect.objectContaining({field:'agency'}),
      expect.objectContaining({field:'jurisdiction'}),
      expect.objectContaining({field:'location'}),
      expect.objectContaining({field:'incidentDate'}),
      expect.objectContaining({field:'subjectMatter'}),
    ]))
  })

  it('flags omitted in-car media and metadata in a partial production without live LLM credentials', async () => {
    const request=buildDashCameraRecordsRequest({agency:'Example Highway Patrol',jurisdiction:'Example State',incidentDate:'2026-08-25',incidentNumber:'2026-7712',location:'Highway 1 at Main St',subjectMatter:'traffic stop',categories:['dash-camera-recordings','dash-camera-metadata','dispatch-and-cad']})
    const analysis=await dashCameraRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,identifiers:{incidentNumber:'2026-7712',location:'Highway 1 at Main St'},records:[{id:'r1',filename:'cad.pdf',category:'dispatch-and-cad',text:'CAD record for incident number 2026-7712.'},{id:'r2',filename:'response.pdf',text:'See in-car video. Portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('dash-camera-recordings')
    expect(analysis.missingCategoryIds).toContain('dash-camera-metadata')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
