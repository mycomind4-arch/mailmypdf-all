import { describe, expect, it } from 'vitest'
import { DEATH_RECORD_CATEGORIES, buildDeathRecordsRequest, productionDeathRecordsWorkflow } from './death-records-production'

describe('production death records workflow',()=>{
  it('builds an access-aware death records request',()=>{
    const request=buildDeathRecordsRequest({agency:'Example Vital Records Office',jurisdiction:'Example State',recordName:'Record Subject',deathYear:'2015',requesterCapacity:'lawful family requester',copyType:'certified copy',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Obtain eligible certificate and verify access status',categories:['certificate-copy-type-and-availability','public-confidential-restricted-and-medical-detail-access-status','registration-cause-of-death-and-medical-detail-status']})
    expect(request.title).toContain('Record Subject')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('death-certificate')
    expect(request.items[1].description).toContain('cause-of-death')
    expect(request.items[2].description).toContain('medical details')
  })
  it('keeps the canonical death-records identity with a production contract',()=>{
    expect(productionDeathRecordsWorkflow.contractVersion).toBe(2)
    expect(productionDeathRecordsWorkflow.manifest.id).toBe('death-records')
    expect(productionDeathRecordsWorkflow.request.categories).toEqual(DEATH_RECORD_CATEGORIES)
    expect(productionDeathRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })
  it('detects missing access and medical-detail status categories',async()=>{
    const request=buildDeathRecordsRequest({agency:'Example Vital Records Office',jurisdiction:'Example State',recordName:'Record Subject',deathYear:'2015',requesterCapacity:'lawful requester',dateStart:'2026-01-01',dateEnd:'2026-09-01',subjectMatter:'Determine lawful certificate access',categories:['certificate-copy-type-and-availability','public-confidential-restricted-and-medical-detail-access-status','registration-cause-of-death-and-medical-detail-status']})
    const analysis=await productionDeathRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'certificate-options.pdf',category:'certificate-copy-type-and-availability',text:'Certificate options. See attached field-level access rules and cause-of-death status. Some fields are restricted.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('public-confidential-restricted-and-medical-detail-access-status')
    expect(analysis.missingCategoryIds).toContain('registration-cause-of-death-and-medical-detail-status')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'})]))
  })
})
