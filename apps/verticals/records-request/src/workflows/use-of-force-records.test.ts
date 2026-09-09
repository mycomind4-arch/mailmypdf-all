import { describe, expect, it } from 'vitest'
import { USE_OF_FORCE_RECORD_CATEGORIES, buildUseOfForceRecordsRequest, useOfForceRecordsWorkflow } from './use-of-force-records'

describe('use of force records workflow', () => {
  it('keeps canonical identity and moves use-of-force records to v2', () => {
    expect(useOfForceRecordsWorkflow.id).toBe('use-of-force-records')
    expect(useOfForceRecordsWorkflow.seo.canonicalPath).toBe('/workflows/use-of-force-records')
    expect(useOfForceRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(useOfForceRecordsWorkflow.contractVersion).toBe(2)
    expect(useOfForceRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(useOfForceRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(useOfForceRecordsWorkflow.request.categories).toEqual(USE_OF_FORCE_RECORD_CATEGORIES)
    expect(useOfForceRecordsWorkflow.request.categories).toContain('request-status-and-release-records')
  })

  it('builds incident-centered force, media, review, injury and status scope', () => {
    const request=buildUseOfForceRecordsRequest({agency:'Example Police Department',jurisdiction:'Example City, Example State',department:'Professional Standards',incidentDate:'2026-08-22',incidentNumber:'2026-5521',location:'300 Pine St',officerNames:'Officer A #123',person:'Example Person',forceDescription:'Disputed takedown and handcuff restraint.',requesterRelationship:'person involved',preferredFormat:'native media plus PDF reports',exclusions:'exclude unrelated force reviews',categories:['use-of-force-reports','body-camera-recordings','supervisor-review-and-approval','injury-and-medical-documentation','complaint-and-administrative-review','request-status-and-release-records']})
    expect(request.title).toContain('2026-5521')
    expect(request.jurisdiction).toBe('Example City, Example State')
    expect(request.items).toHaveLength(6)
    expect(request.items[0].description).toContain('use-of-force reports')
    expect(request.items[1].description).toContain('body-worn camera')
    expect(request.items[2].description).toContain('supervisor reviews')
    expect(request.items[3].description).toContain('agency-maintained incident records documenting reported or observed injuries')
    expect(request.items[4].description).toContain('complaint/intake records')
    expect(request.items[5].description).toContain('request/search status')
    expect(request.items[1].format).toContain('native media')
  })

  it('preserves complaint/finding, medical, media and retention boundaries', () => {
    const request=buildUseOfForceRecordsRequest({agency:'Example PD',jurisdiction:'Example State',incidentDate:'2026-08-22',location:'300 Pine St',forceDescription:'Disputed force event.',categories:USE_OF_FORCE_RECORD_CATEGORIES})
    const corpus=request.items.map(item=>item.description).join(' ').toLowerCase()
    expect(corpus).toContain('a complaint or allegation is not a sustained finding')
    expect(corpus).toContain('not by itself an adjudicated finding')
    expect(corpus).toContain('do not request private clinical records')
    expect(corpus).toContain('do not assume an unredacted version')
    expect(corpus).toContain('do not infer spoliation, misconduct, unlawful withholding, or another legal violation')
    expect(corpus).toContain('do not request evidence-system credentials')
  })

  it('requires agency, jurisdiction, location, incident date and force description', () => {
    const request=buildUseOfForceRecordsRequest({agency:'',incidentDate:'',location:'',forceDescription:''})
    expect(useOfForceRecordsWorkflow.validateRequest({...request,normalizedTitle:request.title,normalizedAgency:request.agency})).toEqual(expect.arrayContaining([
      expect.objectContaining({field:'agency'}),expect.objectContaining({field:'jurisdiction'}),expect.objectContaining({field:'location'}),expect.objectContaining({field:'incidentDate'}),expect.objectContaining({field:'forceDescription'}),
    ]))
  })

  it('flags omitted force records and media in a partial production without live LLMs', async () => {
    const request=buildUseOfForceRecordsRequest({agency:'Example Police Department',jurisdiction:'Example State',incidentDate:'2026-08-22',incidentNumber:'2026-5521',location:'300 Pine St',forceDescription:'takedown',categories:['use-of-force-reports','body-camera-recordings','supervisor-review-and-approval']})
    const analysis=await useOfForceRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,identifiers:{incidentNumber:'2026-5521',location:'300 Pine St'},records:[{id:'r1',filename:'force-report.pdf',category:'use-of-force-reports',text:'Use of force report for incident number 2026-5521.'},{id:'r2',filename:'response.pdf',text:'See body-worn camera evidence. Supervisor review was withheld and portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('body-camera-recordings')
    expect(analysis.missingCategoryIds).toContain('supervisor-review-and-approval')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
