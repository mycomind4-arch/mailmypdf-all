import { describe, expect, it } from 'vitest'
import {
  POLICE_PURSUIT_RECORD_CATEGORIES,
  buildPolicePursuitRecordsRequest,
  policePursuitRecordsWorkflow,
} from './police-pursuit-records'

describe('police pursuit records workflow', () => {
  it('builds an auditable v2 pursuit request with bounded telemetry and release context', () => {
    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      incidentNumber: 'P-2026-44',
      startLocation: 'Main St and 1st Ave',
      endLocation: 'Highway 10 mile 22',
      eventDescription: 'Vehicle pursuit ending in a collision and arrest',
      requesterAccessContext: 'public requester',
      preferredFormat: 'native media and structured exports where maintained',
      narrowingNotes: 'identified units and pursuit window plus immediate aftermath only',
      exclusions: 'unrelated historical location data and private medical records',
      agencyRequestNumber: 'PRA-2026-44',
      releaseStatus: 'partial production',
      categories: [
        'pursuit-and-incident-reports',
        'gps-avl-and-vehicle-telematics',
        'supervisor-and-pursuit-review-records',
      ],
    })

    expect(request.title).toContain('P-2026-44')
    expect(request.jurisdiction).toBe('California')
    expect(request.items).toHaveLength(3)
    expect(request.items[1].description).toContain('limited to the pursuit/event window')
    expect(request.items[1].description).toContain('Do not request unrelated historical location tracking')
    expect(request.items[2].description).toContain('Preserve preliminary, recommended, pending, final')
    expect(request.items[0].format).toBe('native media and structured exports where maintained')

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.requesterAccessContext).toBe('public requester')
    expect(scope.agencyRequestNumber).toBe('PRA-2026-44')
    expect(scope.releaseStatus).toBe('partial production')
  })

  it('declares the canonical executable v2 contract without changing route or category identity', () => {
    expect(policePursuitRecordsWorkflow.contractVersion).toBe(2)
    expect(policePursuitRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(policePursuitRecordsWorkflow.manifest.id).toBe('police-pursuit-records')
    expect(policePursuitRecordsWorkflow.seo.canonicalPath).toBe('/workflows/police-pursuit-records')
    expect(policePursuitRecordsWorkflow.request.categories).toEqual(POLICE_PURSUIT_RECORD_CATEGORIES)
    expect(policePursuitRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('locks telemetry, assignment, review, medical, adjudication, and credential boundaries', () => {
    const policy = policePursuitRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      limitTelematicsToIdentifiedUnitsAndIncidentWindow: true,
      doNotRequestUnrelatedHistoricalLocationTracking: true,
      treatTelemetryAsRecordedEvidenceRequiringContextAndVerification: true,
      doNotInferOfficerOrDriverIdentityWithoutAssignmentEvidence: true,
      preservePreliminaryRecommendedPendingAndFinalReviewStates: true,
      doNotTreatPolicyComplianceFindingAsJudicialLegalityDetermination: true,
      doNotTreatReferralOrTrainingAsProofOfMisconductOrDiscipline: true,
      preserveCitationChargeDispositionAndAdjudicationDistinctions: true,
      doNotInferFaultLiabilityGuiltOrCausationFromOperationalRecords: true,
      requestAgencyMedicalResponseReferencesNotPrivateClinicalRecords: true,
      neverRequestPasswordsOtpsTokensPrivateKeysCadRadioFleetOrEvidenceSystemCredentials: true,
      requireVerifiedAuthorityForJurisdictionSpecificLegalConclusions: true,
    }))

    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      startLocation: 'Main St and 1st Ave',
      eventDescription: 'Vehicle pursuit ending in a collision',
      categories: [
        'gps-avl-and-vehicle-telematics',
        'unit-officer-and-vehicle-assignments',
        'supervisor-and-pursuit-review-records',
        'collision-traffic-and-scene-records',
        'injury-damage-and-medical-response-records',
        'policy-training-and-pursuit-directives',
      ],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('unrelated historical location tracking')
    expect(corpus).toContain("Do not infer a driver's, officer's, or operator's identity")
    expect(corpus).toContain('not by itself a judicial determination of lawfulness')
    expect(corpus).toContain('do not treat a citation, charge, report conclusion, or preliminary reconstruction as an adjudicated finding')
    expect(corpus).toContain('Do not request private clinical charts, diagnoses, treatment records, protected health information')
    expect(corpus).toContain('does not itself establish negligence')
  })

  it('requires jurisdiction before applying disclosure or pursuit-policy rules', () => {
    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      incidentDate: '2026-09-01',
      startLocation: 'Main St and 1st Ave',
      eventDescription: 'Vehicle pursuit ending in a stop',
      categories: ['pursuit-and-incident-reports'],
    })
    const issues = policePursuitRecordsWorkflow.validate(request)
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'jurisdiction' })]))
  })

  it('flags missing telemetry and review records in a partial production without live LLMs', async () => {
    const request = buildPolicePursuitRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentDate: '2026-09-01',
      incidentNumber: 'P-2026-44',
      startLocation: 'Main St and 1st Ave',
      eventDescription: 'Vehicle pursuit ending in a collision',
      categories: [
        'pursuit-and-incident-reports',
        'gps-avl-and-vehicle-telematics',
        'supervisor-and-pursuit-review-records',
      ],
    })

    const analysis = await policePursuitRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'pursuit-report.pdf',
        category: 'pursuit-and-incident-reports',
        text: 'Pursuit P-2026-44 report. GPS data and supervisor review are referenced but were not included. Portions were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('gps-avl-and-vehicle-telematics')
    expect(analysis.missingCategoryIds).toContain('supervisor-and-pursuit-review-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
