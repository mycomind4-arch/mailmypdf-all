import { describe, expect, it } from 'vitest'
import { INTERNAL_AFFAIRS_RECORD_CATEGORIES, buildInternalAffairsRecordsRequest, internalAffairsRecordsWorkflow } from './internal-affairs-records'

describe('internal affairs records workflow', () => {
  it('keeps canonical identity and moves internal-affairs records to v2', () => {
    expect(internalAffairsRecordsWorkflow.id).toBe('internal-affairs-records')
    expect(internalAffairsRecordsWorkflow.seo.canonicalPath).toBe('/workflows/internal-affairs-records')
    expect(internalAffairsRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(internalAffairsRecordsWorkflow.contractVersion).toBe(2)
    expect(internalAffairsRecordsWorkflow.manifest.capabilities).toContain('approval')
    expect(internalAffairsRecordsWorkflow.manifest.capabilities).toContain('proofAudit')
    expect(internalAffairsRecordsWorkflow.request.categories).toEqual(INTERNAL_AFFAIRS_RECORD_CATEGORIES)
    expect(internalAffairsRecordsWorkflow.request.categories).toContain('request-status-and-release-records')
  })

  it('builds complaint, investigation, evidence, disposition and release-status scope', () => {
    const request=buildInternalAffairsRecordsRequest({agency:'Example Police Department',jurisdiction:'Example City, Example State',department:'Professional Standards',complaintNumber:'IA-2026-101',incidentNumber:'2026-5511',dateStart:'2026-01-01',dateEnd:'2026-09-01',officerNames:'Officer A #123',person:'Example Complainant',allegation:'Disputed allegation of unlawful search and inaccurate reporting.',requesterRelationship:'complainant',preferredFormat:'native case index plus PDF records',exclusions:'exclude unrelated complaints involving similarly named employees',categories:['complaint-intake-and-tracking','internal-affairs-investigation-records','evidence-and-media-indexes','findings-and-disposition-records','referral-and-corrective-action-records','request-status-and-release-records']})
    expect(request.title).toContain('IA-2026-101')
    expect(request.jurisdiction).toBe('Example City, Example State')
    expect(request.items).toHaveLength(6)
    expect(request.items[0].description).toContain('complaint intake records')
    expect(request.items[1].description).toContain('investigator notes')
    expect(request.items[2].description).toContain('evidence inventories')
    expect(request.items[3].description).toContain('Preserve exact status language')
    expect(request.items[4].description).toContain('is not discipline unless the record establishes that status')
    expect(request.items[5].description).toContain('request/search status')
    expect(request.items[0].description).toContain('Scope exclusions/narrowing')
  })

  it('preserves complaint, preliminary, finding, discipline and personnel/privacy boundaries', () => {
    const request=buildInternalAffairsRecordsRequest({agency:'Example PD',jurisdiction:'Example State',complaintNumber:'IA-1',dateStart:'2026-01-01',dateEnd:'2026-06-01',officerNames:'Officer A',allegation:'Disputed conduct allegation.',categories:INTERNAL_AFFAIRS_RECORD_CATEGORIES})
    const corpus=request.items.map(item=>item.description).join(' ').toLowerCase()
    expect(corpus).toContain('a complaint or intake allegation is not proof that misconduct occurred')
    expect(corpus).toContain('do not treat an investigator note or preliminary assessment as a final finding')
    expect(corpus).toContain('a referral, recommendation, remedial step, or training assignment is not discipline')
    expect(corpus).toContain('do not assume confidential-source, whistleblower, victim/witness, juvenile, medical, home/contact')
    expect(corpus).toContain('do not request evidence-system credentials')
    expect(corpus).toContain('do not infer spoliation, unlawful withholding, misconduct, waiver, or another legal violation')
  })

  it('requires agency, jurisdiction, date range, allegation and a usable identifier', () => {
    const request=buildInternalAffairsRecordsRequest({agency:'',dateStart:'',dateEnd:'',allegation:''})
    expect(internalAffairsRecordsWorkflow.validateRequest({...request,normalizedTitle:request.title,normalizedAgency:request.agency})).toEqual(expect.arrayContaining([
      expect.objectContaining({field:'agency'}),
      expect.objectContaining({field:'jurisdiction'}),
      expect.objectContaining({field:'allegation'}),
      expect.objectContaining({field:'dateRange'}),
      expect.objectContaining({field:'identifiers'}),
    ]))
  })

  it('flags missing findings and evidence indexes in a partial production without live LLMs', async () => {
    const request=buildInternalAffairsRecordsRequest({agency:'Example Police Department',jurisdiction:'Example State',complaintNumber:'IA-2026-101',dateStart:'2026-01-01',dateEnd:'2026-09-01',officerNames:'Officer A #123',allegation:'unlawful search',categories:['complaint-intake-and-tracking','evidence-and-media-indexes','findings-and-disposition-records']})
    const analysis=await internalAffairsRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'complaint.pdf',category:'complaint-intake-and-tracking',text:'Complaint IA-2026-101 intake record.'},{id:'r2',filename:'response.pdf',text:'See evidence index. Findings were withheld and portions were redacted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('evidence-and-media-indexes')
    expect(analysis.missingCategoryIds).toContain('findings-and-disposition-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REDACTION_REVIEW'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
