import { describe, expect, it } from 'vitest'
import { MEDICAL_RECORD_CATEGORIES, buildMedicalRecordsRequest, productionMedicalRecordsWorkflow } from './medical-records-production'

describe('production medical records workflow',()=>{
  it('builds an authorization-aware medical records request',()=>{
    const request=buildMedicalRecordsRequest({agency:'Example Health System',patientName:'Patient A',requesterCapacity:'patient',facilityOrDepartment:'Example Clinic',dateStart:'2025-01-01',dateEnd:'2026-09-01',subjectMatter:'Obtain complete accessible treatment records',categories:['designated-record-set-and-chart-index','laboratory-pathology-and-test-results','imaging-reports-and-native-image-availability']})
    expect(request.title).toContain('Patient A')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('designated record set')
    expect(request.items[1].description).toContain('laboratory')
    expect(request.items[2].description).toContain('imaging')
  })
  it('keeps the canonical medical-records identity with a production contract',()=>{
    expect(productionMedicalRecordsWorkflow.contractVersion).toBe(2)
    expect(productionMedicalRecordsWorkflow.manifest.id).toBe('medical-records')
    expect(productionMedicalRecordsWorkflow.request.categories).toEqual(MEDICAL_RECORD_CATEGORIES)
    expect(productionMedicalRecordsWorkflow.capabilities).toEqual(expect.arrayContaining(['classification','extraction','contradiction','evidence','research','strategy','validation','review','approval','mailing','tracking','proofAudit']))
  })
  it('detects missing test and imaging categories in a partial production',async()=>{
    const request=buildMedicalRecordsRequest({agency:'Example Health System',patientName:'Patient A',requesterCapacity:'patient',dateStart:'2025-01-01',dateEnd:'2026-09-01',subjectMatter:'Audit produced records',categories:['designated-record-set-and-chart-index','laboratory-pathology-and-test-results','imaging-reports-and-native-image-availability']})
    const analysis=await productionMedicalRecordsWorkflow.responseAnalysis!.analyze({requestedItems:request.items,records:[{id:'r1',filename:'chart-index.pdf',category:'designated-record-set-and-chart-index',text:'Chart document index. See attached laboratory results and imaging study index. Portions are withheld pending authorization review.'}]}) as {missingCategoryIds:string[];findings:Array<{type:string}>}
    expect(analysis.missingCategoryIds).toContain('laboratory-pathology-and-test-results')
    expect(analysis.missingCategoryIds).toContain('imaging-reports-and-native-image-availability')
    expect(analysis.findings).toEqual(expect.arrayContaining([expect.objectContaining({type:'PARTIAL_PRODUCTION'}),expect.objectContaining({type:'REFERENCED_RECORD_NOT_PRODUCED'}),expect.objectContaining({type:'REDACTION_REVIEW'})]))
  })
})
