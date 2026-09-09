import { describe, expect, it } from 'vitest'
import {
  buildCodeEnforcementRequest,
  codeEnforcementRecordsWorkflow,
  CODE_ENFORCEMENT_RECORD_CATEGORIES,
} from './code-enforcement-records'

describe('code enforcement records workflow', () => {
  const input = {
    agency: 'Example County',
    jurisdiction: 'California / Example County',
    department: 'Code Enforcement',
    propertyAddress: '123 Main St',
    parcelNumber: 'APN-123',
    caseNumber: 'CE-2026-001',
    violationNumber: 'V-22',
    relatedParty: 'Example LLC',
    dateStart: '2024-01-01',
    dateEnd: '2026-01-31',
    subjectMatter: 'Reported unpermitted construction and related enforcement activity',
    requesterAccessContext: 'property owner and public requester',
    preferredFormat: 'searchable PDF and native media where maintained',
    narrowingNotes: 'identified property and case only',
    exclusions: 'private complainant contact data and system credentials',
    priorRequestDate: '2026-08-01',
    agencyRequestNumber: 'PRA-2026-100',
    agencyResponseDate: '2026-08-15',
    releaseStatus: 'partial production',
  }

  it('declares the canonical v2 flagship contract without changing route or category identity', () => {
    expect(codeEnforcementRecordsWorkflow.contractVersion).toBe(2)
    expect(codeEnforcementRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(codeEnforcementRecordsWorkflow.id).toBe('code-enforcement-records')
    expect(codeEnforcementRecordsWorkflow.manifest.id).toBe('code-enforcement-records')
    expect(codeEnforcementRecordsWorkflow.seo.canonicalPath).toBe('/workflows/code-enforcement-records')
    expect(codeEnforcementRecordsWorkflow.request.categories).toEqual(CODE_ENFORCEMENT_RECORD_CATEGORIES)
    expect(codeEnforcementRecordsWorkflow.manifest.capabilities).toHaveLength(17)
  })

  it('builds identifier-rich, date-bounded, auditable request items', () => {
    const request = buildCodeEnforcementRequest(input)
    expect(request.agency).toBe('Example County')
    expect(request.jurisdiction).toBe('California / Example County')
    expect(request.items).toHaveLength(CODE_ENFORCEMENT_RECORD_CATEGORIES.length)
    expect(request.items[0].dateStart).toBe('2024-01-01')
    expect(request.items[0].dateEnd).toBe('2026-01-31')
    expect(request.items.some((item) => item.description.includes('case number CE-2026-001'))).toBe(true)
    expect(request.items.some((item) => item.description.includes('property address 123 Main St'))).toBe(true)
    expect(request.items.every((item) => item.format === 'searchable PDF and native media where maintained')).toBe(true)

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.requesterAccessContext).toBe('property owner and public requester')
    expect(scope.agencyRequestNumber).toBe('PRA-2026-100')
    expect(scope.releaseStatus).toBe('partial production')
  })

  it('locks complaint, inspection, service, warrant, lien, compliance, permit, privacy, and secret boundaries', () => {
    const policy = codeEnforcementRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      preserveComplaintAllegationObservationAgencyConclusionFindingAndAdjudicationDistinctions: true,
      doNotTreatComplaintNoticeCitationOrCaseStatusAsConclusiveViolationProof: true,
      doNotInferConsentLawfulEntryWarrantAuthorityExigencyRefusalOrObstruction: true,
      doNotInferValidServiceWaiverDefaultFinalityOrDeadlineConsequenceFromDocumentDateAlone: true,
      doNotInferWarrantIssuanceLienValidityOrEnforcementAuthorityFromReferenceAlone: true,
      doNotInferPhysicalComplianceNoncomplianceLiabilityOrFinalClosureFromStatusAlone: true,
      doNotInferLegalityOrIllegalityFromPermitPresenceOrAbsenceAlone: true,
      protectComplainantVictimWitnessJuvenileMedicalHomeContactPersonnelAndConfidentialSourceData: true,
      neverRequestPasswordsOtpsTokensPrivateKeysRecoveryCodesHiddenStoragePathsOrSystemCredentials: true,
      neverInventDeadlinesExemptionsPrivilegesInspectionRightsEntryRightsHearingRightsAppealRightsOrAccessEntitlement: true,
      requireVerifiedAuthorityForJurisdictionSpecificRecordsInspectionEnforcementServiceWarrantLienDeadlineAndAppealConclusions: true,
      requireHumanReviewForConsequentialPrivacyInspectionEntryServiceFinalityLienWarrantDeadlineAndLegalAmbiguity: true,
    }))

    const request = buildCodeEnforcementRequest({
      ...input,
      categories: ['complaints', 'inspections', 'notices-and-orders', 'enforcement-actions', 'abatement-and-compliance', 'permits-and-related-records'],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('source-attributed allegations rather than verified facts')
    expect(corpus).toContain('do not infer consent, lawful entry, warrant authority')
    expect(corpus).toContain('Do not infer valid service, finality, enforceability, waiver, default, or deadline consequences')
    expect(corpus).toContain('Do not infer warrant issuance from an application')
    expect(corpus).toContain('does not by itself prove physical compliance')
    expect(corpus).toContain('Do not infer that work was lawful merely because a permit record exists')
  })

  it('requires a usable property/case identifier and jurisdiction', () => {
    const request = buildCodeEnforcementRequest({
      agency: 'Example County',
      subjectMatter: 'Reported code issue',
      dateStart: '2024-01-01',
      dateEnd: '2024-12-31',
    })
    const validated = { ...request, normalizedTitle: request.title, normalizedAgency: request.agency }
    const issues = codeEnforcementRecordsWorkflow.validateRequest(validated)
    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(['identifiers', 'jurisdiction']))
  })

  it('allows deliberate category narrowing when it is explicitly documented', () => {
    const request = buildCodeEnforcementRequest({
      ...input,
      categories: ['inspections', 'photographs-and-video'],
      narrowingNotes: 'inspection reports and field media only',
    })
    const validated = { ...request, normalizedTitle: request.title, normalizedAgency: request.agency }
    const issues = codeEnforcementRecordsWorkflow.validateRequest(validated)
    expect(issues.map((issue) => issue.field)).not.toContain('categories')
  })
})
