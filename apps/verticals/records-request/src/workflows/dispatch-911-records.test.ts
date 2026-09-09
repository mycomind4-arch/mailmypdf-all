import { describe, expect, it } from 'vitest'
import { DISPATCH_911_RECORD_CATEGORIES, buildDispatch911RecordsRequest, dispatch911RecordsWorkflow } from './dispatch-911-records'

describe('911 call and dispatch records workflow', () => {
  it('keeps canonical identity and moves dispatch/911 records to v2', () => {
    expect(dispatch911RecordsWorkflow.id).toBe('dispatch-911-records')
    expect(dispatch911RecordsWorkflow.seo.canonicalPath).toBe('/workflows/dispatch-911-records')
    expect(dispatch911RecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(dispatch911RecordsWorkflow.contractVersion).toBe(2)
    expect(dispatch911RecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(dispatch911RecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(dispatch911RecordsWorkflow.request.categories).toEqual(DISPATCH_911_RECORD_CATEGORIES)
    expect(dispatch911RecordsWorkflow.request.categories).toContain('request-status-and-release-records')
  })

  it('builds audio, CAD, radio, response-history and release-status scope', () => {
    const request=buildDispatch911RecordsRequest({
      agency:'Example Emergency Communications Center',
      jurisdiction:'Example County, Example State',
      department:'Emergency Communications Records',
      incidentDate:'2026-08-20',timeStart:'21:05',timeEnd:'21:40',incidentNumber:'CAD-2026-9912',location:'200 Oak St',callerPhone:'555-0100',person:'Example Person',subjectMatter:'Reported disturbance and disputed statements about the police response.',requesterRelationship:'involved party',preferredFormat:'native audio plus structured CAD export',exclusions:'exclude unrelated calls at the same address',categories:['911-call-audio','cad-event-history','dispatch-radio-audio','retention-and-deletion-records','request-status-and-release-records'],
    })
    expect(request.title).toContain('CAD-2026-9912')
    expect(request.jurisdiction).toBe('Example County, Example State')
    expect(request.items).toHaveLength(5)
    expect(request.items[0].description).toContain('audio recordings')
    expect(request.items[1].description).toContain('CAD or call-for-service event history')
    expect(request.items[2].description).toContain('dispatch and radio traffic')
    expect(request.items[3].description).toContain('retention classifications')
    expect(request.items[4].description).toContain('request/search status')
    expect(request.items[0].format).toContain('native audio')
    expect(request.items[0].description).toContain('Scope exclusions/narrowing')
  })

  it('protects caller, medical, radio-system and CAD-system sensitive data', () => {
    const request=buildDispatch911RecordsRequest({agency:'Example ECC',jurisdiction:'Example State',incidentDate:'2026-08-20',location:'200 Oak St',subjectMatter:'Disputed emergency response.',categories:DISPATCH_911_RECORD_CATEGORIES})
    const corpus=request.items.map(item=>item.description).join(' ').toLowerCase()
    expect(corpus).toContain('do not assume caller identity')
    expect(corpus).toContain('medical information')
    expect(corpus).toContain('do not request telecommunications credentials')
    expect(corpus).toContain('do not demand encryption keys')
    expect(corpus).toContain('not cad credentials')
    expect(corpus).toContain('do not infer deletion, spoliation, misconduct, or a legal violation')
    expect(corpus).toContain('not an adjudicated finding')
  })

  it('requires agency, jurisdiction, location, event date and description', () => {
    const request=buildDispatch911RecordsRequest({agency:'',incidentDate:'',location:'',subjectMatter:''})
    expect(dispatch911RecordsWorkflow.validateRequest({...request,normalizedTitle:request.title,normalizedAgency:request.agency})).toEqual(expect.arrayContaining([
      expect.objectContaining({field:'agency'}),expect.objectContaining({field:'jurisdiction'}),expect.objectContaining({field:'location'}),expect.objectContaining({field:'incidentDate'}),expect.objectContaining({field:'subjectMatter'}),
    ]))
  })

  it('finds missing dispatch records in a partial production without live LLMs', async () => {
    const request=buildDispatch911RecordsRequest({agency:'Example Emergency Communications Center',jurisdiction:'Example State',incidentDate:'2026-08-20',incidentNumber:'CAD-2026-9912',location:'200 Oak St',subjectMatter:'reported disturbance',categories:['911-call-audio','cad-event-history','dispatch-radio-audio']})
    const analysis=await dispatch911RecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,identifiers:{incidentNumber:'CAD-2026-9912',location:'200 Oak St'},records:[{id:'r1',filename:'911-call.wav',category:'911-call-audio',text:'911 call recording for CAD number CAD-2026-9912.'},{id:'r2',filename:'response.pdf',text:'See attached CAD event. Radio traffic was withheld and portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('cad-event-history')
    expect(analysis.missingCategoryIds).toContain('dispatch-radio-audio')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
