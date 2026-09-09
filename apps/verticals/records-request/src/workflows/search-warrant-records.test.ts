import { describe, expect, it } from 'vitest'
import {
  SEARCH_WARRANT_RECORD_CATEGORIES,
  buildSearchWarrantRecordsRequest,
  searchWarrantRecordsWorkflow,
} from './search-warrant-records'

describe('search warrant records workflow', () => {
  it('builds an auditable jurisdiction-sensitive v2 warrant request', () => {
    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      issuingCourt: 'Example Superior Court',
      warrantNumber: 'SW-2026-88',
      caseNumber: 'CR-2026-501',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      location: '123 Main Street',
      requesterAccessContext: 'public requester',
      preferredFormat: 'searchable PDF and structured docket export where maintained',
      narrowingNotes: 'identified warrant and incorporated attachments only',
      exclusions: 'credentials, unrelated private communications, and medical information',
      agencyRequestNumber: 'PRA-2026-88',
      releaseStatus: 'partially sealed',
      categories: ['warrant-and-order', 'return-and-inventory', 'sealing-unsealing-and-access-orders'],
    })

    expect(request.title).toContain('SW-2026-88')
    expect(request.jurisdiction).toBe('California')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('do not infer validity')
    expect(request.items[1].description).toContain('Do not infer that every item')
    expect(request.items[2].description).toContain('latest verified access status')
    expect(request.items[0].format).toBe('searchable PDF and structured docket export where maintained')

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.issuingCourt).toBe('Example Superior Court')
    expect(scope.requesterAccessContext).toBe('public requester')
    expect(scope.releaseStatus).toBe('partially sealed')
  })

  it('declares the canonical executable v2 contract', () => {
    expect(searchWarrantRecordsWorkflow.contractVersion).toBe(2)
    expect(searchWarrantRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(searchWarrantRecordsWorkflow.manifest.id).toBe('search-warrant-records')
    expect(searchWarrantRecordsWorkflow.seo.canonicalPath).toBe('/workflows/search-warrant-records')
    expect(searchWarrantRecordsWorkflow.request.categories).toEqual(SEARCH_WARRANT_RECORD_CATEGORIES)
    expect(searchWarrantRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('locks affidavit, sealing, execution, seizure, privacy, and credential boundaries', () => {
    const policy = searchWarrantRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      doNotCircumventSealingOrAccessOrders: true,
      preserveSourceAttributionForAffidavitAssertions: true,
      doNotTreatAffidavitAllegationsAsAdjudicatedFacts: true,
      doNotInferProbableCauseSufficiencyOrWarrantValidity: true,
      doNotInferSearchLawfulnessOrScopeComplianceFromExecutionRecords: true,
      doNotInferSeizureFromNarrativeWithoutReturnInventoryOrPropertyEvidence: true,
      doNotInferPublicAccessFromDocketPresenceOrRelatedRelease: true,
      neverRequestPasswordsPasscodesTokensPrivateKeysRecoveryCodesOrSystemCredentials: true,
      neverInventWarrantExistenceIssuanceExecutionReturnSeizureOrSealingStatus: true,
      requireVerifiedAuthorityForJurisdictionSpecificLegalConclusions: true,
    }))

    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      warrantNumber: 'SW-2026-88',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      categories: [
        'application-affidavit-and-probable-cause-materials',
        'execution-and-service-records',
        'evidence-property-and-seizure-records',
        'docket-index-and-case-tracking',
      ],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('source-attributed assertions rather than adjudicated facts')
    expect(corpus).toContain('do not convert an execution narrative into a legal conclusion')
    expect(corpus).toContain('do not request passwords, passcodes, encryption keys')
    expect(corpus).toContain('filing/status evidence only')
  })

  it('requires jurisdiction before applying sealing or access rules', () => {
    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      warrantNumber: 'SW-2026-88',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      categories: ['warrant-and-order'],
    })
    const issues = searchWarrantRecordsWorkflow.validate(request)
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'jurisdiction' })]))
  })

  it('flags missing return and docket records in a partial production without live LLMs', async () => {
    const request = buildSearchWarrantRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      warrantNumber: 'SW-2026-88',
      dateStart: '2026-08-01',
      dateEnd: '2026-08-31',
      location: '123 Main Street',
      categories: ['warrant-and-order', 'return-and-inventory', 'docket-index-and-case-tracking'],
    })
    const analysis = await searchWarrantRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'warrant.pdf',
        category: 'warrant-and-order',
        text: 'Search warrant SW-2026-88. The return and inventory are referenced but not included. Portions were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('return-and-inventory')
    expect(analysis.missingCategoryIds).toContain('docket-index-and-case-tracking')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
