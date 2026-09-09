import { describe, expect, it } from 'vitest'
import {
  OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES,
  buildOfficerInvolvedShootingRecordsRequest,
  officerInvolvedShootingRecordsWorkflow,
} from './officer-involved-shooting-records'

describe('officer involved shooting records workflow', () => {
  it('builds an auditable jurisdiction-sensitive v2 critical-incident request', () => {
    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      incidentNumber: 'OIS-2026-4',
      location: '100 Main Street',
      officerNames: 'Officer A #123',
      externalAgency: 'Example District Attorney',
      eventDescription: 'Officer firearm discharge during an arrest encounter',
      requesterAccessContext: 'public requester',
      preferredFormat: 'native media and searchable PDF where maintained',
      narrowingNotes: 'identified incident and final public review materials',
      exclusions: 'private clinical records, credentials, and unrelated personnel material',
      agencyRequestNumber: 'PRA-2026-4',
      releaseStatus: 'partial production',
      categories: [
        'critical-incident-and-shooting-reports',
        'officer-weapon-and-firearm-discharge-records',
        'prosecutor-or-external-review-records',
      ],
    })

    expect(request.title).toContain('OIS-2026-4')
    expect(request.jurisdiction).toBe('California')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('distinct evidentiary states')
    expect(request.items[1].description).toContain('do not infer who fired a specific round')
    expect(request.items[2].description).toContain('A charging decision is not a conviction')
    expect(request.items[0].format).toBe('native media and searchable PDF where maintained')

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.requesterAccessContext).toBe('public requester')
    expect(scope.agencyRequestNumber).toBe('PRA-2026-4')
    expect(scope.releaseStatus).toBe('partial production')
  })

  it('declares the canonical executable v2 contract without changing route or category identity', () => {
    expect(officerInvolvedShootingRecordsWorkflow.contractVersion).toBe(2)
    expect(officerInvolvedShootingRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(officerInvolvedShootingRecordsWorkflow.manifest.id).toBe('officer-involved-shooting-records')
    expect(officerInvolvedShootingRecordsWorkflow.seo.canonicalPath).toBe('/workflows/officer-involved-shooting-records')
    expect(officerInvolvedShootingRecordsWorkflow.request.categories).toEqual(OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES)
    expect(officerInvolvedShootingRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('locks investigative, forensic, firearm, review, charging, privacy, and credential boundaries', () => {
    const policy = officerInvolvedShootingRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      preserveAllegationObservationNarrativeInvestigationAndAdjudicationDistinctions: true,
      preservePreliminaryAndFinalForensicStatus: true,
      doNotInferBallisticMatchTrajectoryCausationOrShooterIdentityWithoutSupportingEvidence: true,
      preservePreliminaryRecommendedPendingAndFinalAdministrativeReviewStates: true,
      doNotTreatPolicyComplianceOrAdministrativeFindingAsJudicialLegalityDetermination: true,
      preserveChargingDeclinationReferralAndAdjudicationAsSeparateStates: true,
      doNotTreatChargingDecisionAsConviction: true,
      doNotTreatDeclinationAsJudicialFindingOfLawfulnessOrJustification: true,
      neverRequestPasswordsPasscodesOtpsTokensPrivateKeysRecoveryCodesOrSystemCredentials: true,
      neverInventDeadlinesCriticalIncidentClassificationExemptionsPrivilegesDisclosureRightsOrAccessEntitlement: true,
      requireVerifiedAuthorityForJurisdictionSpecificCriticalIncidentAndLegalConclusions: true,
    }))

    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      location: '100 Main Street',
      eventDescription: 'Officer firearm discharge',
      categories: [
        'scene-evidence-forensics-and-diagrams',
        'witness-interviews-and-statements',
        'supervisor-critical-incident-and-administrative-review',
        'policy-training-and-directive-records',
        'retention-redaction-and-withholding-records',
      ],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('Preserve preliminary versus final forensic status')
    expect(corpus).toContain("Preserve each statement as the speaker's account")
    expect(corpus).toContain('not by itself a judicial determination of lawfulness')
    expect(corpus).toContain('does not itself establish constitutional compliance')
    expect(corpus).toContain('Do not infer spoliation, unlawful withholding')
  })

  it('requires jurisdiction before applying critical-incident disclosure rules', () => {
    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      incidentNumber: 'OIS-2026-4',
      location: '100 Main Street',
      eventDescription: 'Officer firearm discharge',
      categories: ['critical-incident-and-shooting-reports'],
    })
    const issues = officerInvolvedShootingRecordsWorkflow.validate(request)
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'jurisdiction' })]))
  })

  it('flags missing firearm and outside-review records in a partial production without live LLMs', async () => {
    const request = buildOfficerInvolvedShootingRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      incidentNumber: 'OIS-2026-4',
      location: '100 Main Street',
      eventDescription: 'Officer firearm discharge',
      categories: [
        'critical-incident-and-shooting-reports',
        'officer-weapon-and-firearm-discharge-records',
        'prosecutor-or-external-review-records',
      ],
    })

    const analysis = await officerInvolvedShootingRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'critical-incident.pdf',
        category: 'critical-incident-and-shooting-reports',
        text: 'Critical incident OIS-2026-4. Firearm discharge report and prosecutor review are referenced but not included. Portions were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('officer-weapon-and-firearm-discharge-records')
    expect(analysis.missingCategoryIds).toContain('prosecutor-or-external-review-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
