import { describe, expect, it } from 'vitest'
import {
  OFFICER_DISCIPLINE_RECORD_CATEGORIES,
  buildOfficerDisciplineRecordsRequest,
  officerDisciplineRecordsWorkflow,
} from './officer-discipline-records'

describe('officer discipline records workflow', () => {
  it('builds a jurisdiction-sensitive v2 request with auditable scope', () => {
    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      badgeNumber: '123',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      state: 'California',
      conduct: 'dishonesty allegation and disciplinary review',
      requesterAccessContext: 'public requester',
      preferredFormat: 'searchable PDF and structured export where maintained',
      narrowingNotes: 'completed matters and currently operative outcomes only',
      exclusions: 'home address, personal phone numbers, medical records, and credentials',
      priorRequestDate: '2026-08-01',
      agencyRequestNumber: 'PRA-2026-99',
      agencyResponseDate: '2026-08-15',
      releaseStatus: 'partial production',
      categories: [
        'disciplinary-findings-and-final-outcomes',
        'certification-licensing-and-decertification-records',
        'disciplinary-indexes-and-case-tracking',
      ],
    })

    expect(request.title).toContain('Officer A')
    expect(request.jurisdiction).toBe('California')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('exact outcome and effective status')
    expect(request.items[1].description).toContain('Do not infer certification')
    expect(request.items[2].description).toContain('search/status evidence only')
    expect(request.items[0].format).toBe('searchable PDF and structured export where maintained')

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.requesterAccessContext).toBe('public requester')
    expect(scope.agencyRequestNumber).toBe('PRA-2026-99')
    expect(scope.releaseStatus).toBe('partial production')
  })

  it('declares the canonical executable v2 contract without changing route or category identity', () => {
    expect(officerDisciplineRecordsWorkflow.contractVersion).toBe(2)
    expect(officerDisciplineRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(officerDisciplineRecordsWorkflow.manifest.id).toBe('officer-discipline-records')
    expect(officerDisciplineRecordsWorkflow.seo.canonicalPath).toBe('/workflows/officer-discipline-records')
    expect(officerDisciplineRecordsWorkflow.request.categories).toEqual(OFFICER_DISCIPLINE_RECORD_CATEGORIES)
    expect(officerDisciplineRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification',
      'extraction',
      'contradiction',
      'evidence',
      'research',
      'strategy',
      'validation',
      'review',
      'approval',
      'mailing',
      'tracking',
      'proofAudit',
    ]))
  })

  it('locks allegation, discipline, appeal, certification, credibility, and privacy boundaries', () => {
    const policy = officerDisciplineRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      preserveExactAgencyFindingAndDispositionLanguage: true,
      preservePreliminaryVersusFinalStatus: true,
      preserveAppealModificationReversalAndRemandStatus: true,
      doNotPromoteComplaintAllegationOrReferralToFinding: true,
      doNotTreatTrainingOrCorrectiveActionAsDisciplineByItself: true,
      doNotInferResignationInLieuOfDiscipline: true,
      doNotInferCertificationStatusFromEmploymentOrDiscipline: true,
      doNotInferBradyGiglioStatusOrCredibilityFinding: true,
      neverRequestPasswordsOtpsTokensPrivateKeysOrSystemCredentials: true,
      neverInventCaseExistenceDisciplineFindingsCertificationOrSeparationStatus: true,
      requireVerifiedAuthorityForJurisdictionSpecificLegalConclusions: true,
      requireHumanReviewForConsequentialStatusPrivacyPrivilegeAndAccessAmbiguity: true,
    }))

    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      state: 'California',
      categories: [
        'sustained-misconduct-records',
        'brady-giglio-and-credibility-disclosure-records',
        'policy-training-and-remedial-action-records',
        'appeal-grievance-and-review-records',
        'separation-resignation-and-last-chance-records',
      ],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('Do not convert allegations')
    expect(corpus).toContain('Do not infer list inclusion')
    expect(corpus).toContain('do not treat training by itself as proof of misconduct or discipline')
    expect(corpus).toContain('do not present an earlier discipline decision as final when a later review changed it')
    expect(corpus).toContain('Do not label a resignation or retirement as discipline-related')
  })

  it('requires jurisdiction before applying disclosure or certification rules', () => {
    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      categories: ['disciplinary-findings-and-final-outcomes'],
    })
    const issues = officerDisciplineRecordsWorkflow.validate(request)
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'state' }),
    ]))
  })

  it('detects an incomplete disciplinary production deterministically without live LLMs', async () => {
    const request = buildOfficerDisciplineRecordsRequest({
      agency: 'Example Police Department',
      officerName: 'Officer A',
      dateStart: '2020-01-01',
      dateEnd: '2026-09-01',
      state: 'California',
      categories: [
        'disciplinary-findings-and-final-outcomes',
        'certification-licensing-and-decertification-records',
        'disciplinary-indexes-and-case-tracking',
      ],
    })
    const analysis = await officerDisciplineRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        {
          id: 'r1',
          filename: 'discipline.pdf',
          category: 'disciplinary-findings-and-final-outcomes',
          text: 'Final disciplinary finding for Officer A. Certification records were withheld and portions were redacted.',
        },
      ],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('certification-licensing-and-decertification-records')
    expect(analysis.missingCategoryIds).toContain('disciplinary-indexes-and-case-tracking')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
    ]))
  })
})
