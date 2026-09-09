import { describe, expect, it } from 'vitest'
import { MARRIAGE_RECORD_CATEGORIES, buildMarriageRecordsRequest, productionMarriageRecordsWorkflow } from './marriage-records-production'

describe('production marriage records workflow', () => {
  it('builds an access-aware marriage records request', () => {
    const request=buildMarriageRecordsRequest({agency:'Example Clerk',jurisdiction:'Example County',party1Name:'Party A',party2Name:'Party B',marriageYear:'2005',requesterCapacity:'party to the marriage',copyType:'certified copy',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Obtain an eligible marriage record',categories:['license-certificate-copy-type-and-availability','public-confidential-and-restricted-access-status','application-order-and-submission-requirements']})
    expect(request.title).toContain('Party A')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('marriage-license')
    expect(request.items[1].description).toContain('public, confidential, restricted')
    expect(request.items[2].description).toContain('application/order forms')
  })
  it('keeps the canonical marriage-records identity with a production contract',()=>{
    expect(productionMarriageRecordsWorkflow.contractVersion).toBe(2)
    expect(productionMarriageRecordsWorkflow.manifest.id).toBe('marriage-records')
    expect(productionMarriageRecordsWorkflow.request.categories).toEqual(MARRIAGE_RECORD_CATEGORIES)
    expect(productionMarriageRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })
  it('detects missing access and application information in a partial production',async()=>{
    const request=buildMarriageRecordsRequest({agency:'Example Clerk',jurisdiction:'Example County',party1Name:'Party A',marriageYear:'2005',requesterCapacity:'lawful requester',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Determine lawful access',categories:['license-certificate-copy-type-and-availability','public-confidential-and-restricted-access-status','application-order-and-submission-requirements']})
    const analysis=await productionMarriageRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'copy-options.pdf',category:'license-certificate-copy-type-and-availability',text:'Available copy options. See attached access-status rules and application. Some records are restricted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('public-confidential-and-restricted-access-status')
    expect(analysis.missingCategoryIds).toContain('application-order-and-submission-requirements')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
