import { describe, expect, it } from 'vitest'
import { DIVORCE_RECORD_CATEGORIES, buildDivorceRecordsRequest, productionDivorceRecordsWorkflow } from './divorce-records-production'

describe('production divorce records workflow',()=>{
  it('builds an access-aware decree and disposition request',()=>{
    const request=buildDivorceRecordsRequest({agency:'Example Court',jurisdiction:'Example County',party1Name:'Party A',party2Name:'Party B',caseNumber:'FAM-001',divorceYear:'2010',requesterCapacity:'party to the case',copyType:'certified decree',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Obtain final decree and verify disposition',categories:['decree-judgment-certificate-and-copy-availability','case-index-docket-and-disposition-status','public-sealed-confidential-and-restricted-access-status']})
    expect(request.title).toContain('FAM-001')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('divorce decree')
    expect(request.items[1].description).toContain('case index')
    expect(request.items[2].description).toContain('public, sealed, confidential')
  })
  it('keeps the canonical divorce-records identity with a production contract',()=>{
    expect(productionDivorceRecordsWorkflow.contractVersion).toBe(2)
    expect(productionDivorceRecordsWorkflow.manifest.id).toBe('divorce-records')
    expect(productionDivorceRecordsWorkflow.request.categories).toEqual(DIVORCE_RECORD_CATEGORIES)
    expect(productionDivorceRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })
  it('detects missing disposition and access-status categories',async()=>{
    const request=buildDivorceRecordsRequest({agency:'Example Court',jurisdiction:'Example County',party1Name:'Party A',divorceYear:'2010',requesterCapacity:'lawful requester',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Verify final status',categories:['decree-judgment-certificate-and-copy-availability','case-index-docket-and-disposition-status','public-sealed-confidential-and-restricted-access-status']})
    const analysis=await productionDivorceRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'decree-options.pdf',category:'decree-judgment-certificate-and-copy-availability',text:'Decree copy options. See attached case disposition and access-status notice. Some portions are restricted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('case-index-docket-and-disposition-status')
    expect(analysis.missingCategoryIds).toContain('public-sealed-confidential-and-restricted-access-status')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
