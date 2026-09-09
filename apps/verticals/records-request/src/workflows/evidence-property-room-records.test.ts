import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES,
  buildEvidencePropertyRoomRecordsRequest,
  evidencePropertyRoomRecordsWorkflow,
} from './evidence-property-room-records'

describe('evidence property room records workflow', () => {
  it('builds an auditable jurisdiction-sensitive v2 custody request', () => {
    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      requesterAccessContext: 'owner and public requester',
      preferredFormat: 'structured export where maintained',
      narrowingNotes: 'EV-44 transactions and disposition only',
      exclusions: 'facility security details, credentials, and unrelated evidence',
      agencyRequestNumber: 'PRA-2026-44',
      releaseStatus: 'authorized for release',
      categories: [
        'evidence-and-property-inventory',
        'chain-of-custody-and-transfer-history',
        'release-return-and-disposition-records',
      ],
    })

    expect(request.title).toContain('EV-44')
    expect(request.jurisdiction).toBe('California')
    expect(request.items).toHaveLength(3)
    expect(request.items[0].description).toContain('does not establish authenticity')
    expect(request.items[1].description).toContain('do not infer tampering')
    expect(request.items[2].description).toContain('rather than treating authorization as completed disposition')
    expect(request.items[1].format).toBe('structured export where maintained')

    const scope = JSON.parse(request.scope) as Record<string, unknown>
    expect(scope.intakeVersion).toBe('2.0.0')
    expect(scope.requesterAccessContext).toBe('owner and public requester')
    expect(scope.agencyRequestNumber).toBe('PRA-2026-44')
    expect(scope.releaseStatus).toBe('authorized for release')
  })

  it('declares the canonical executable v2 contract without changing route or category identity', () => {
    expect(evidencePropertyRoomRecordsWorkflow.contractVersion).toBe(2)
    expect(evidencePropertyRoomRecordsWorkflow.intakeVersion).toBe('2.0.0')
    expect(evidencePropertyRoomRecordsWorkflow.manifest.id).toBe('evidence-property-room-records')
    expect(evidencePropertyRoomRecordsWorkflow.seo.canonicalPath).toBe('/workflows/evidence-property-room-records')
    expect(evidencePropertyRoomRecordsWorkflow.request.categories).toEqual(EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES)
    expect(evidencePropertyRoomRecordsWorkflow.capabilities).toEqual(expect.arrayContaining([
      'classification', 'extraction', 'contradiction', 'evidence', 'research', 'strategy',
      'validation', 'review', 'approval', 'mailing', 'tracking', 'proofAudit',
    ]))
  })

  it('locks custody, disposition, audit, facility-security, forensic, and missing-item boundaries', () => {
    const policy = evidencePropertyRoomRecordsWorkflow.policies?.[0]?.rules
    expect(policy).toEqual(expect.objectContaining({
      preserveCustodyGapsCorrectionsDuplicatesAndUncertainTransitions: true,
      doNotInferTamperingSubstitutionContaminationLossOrInvalidityFromCustodyGapAlone: true,
      preserveAuthorizedScheduledCompletedCancelledAndCorrectedDispositionStates: true,
      doNotTreatDestructionAuthorizationRetentionExpiryOrScheduleAsProofOfDestruction: true,
      requestAuditHistoryLimitedToResponsiveItemActivity: true,
      protectSecureFacilityLayoutAccessControlAlarmAndSurveillanceSecurityDetails: true,
      preserveLaboratoryRequestedSubmittedPendingPreliminaryCompletedAndFinalStates: true,
      doNotTreatLaboratorySubmissionAsProofOfTestingOrResult: true,
      preserveMissingTransferredDestroyedNotCreatedNotRetainedAndWithheldStatuses: true,
      doNotInferSpoliationUnlawfulDestructionConcealmentTamperingOrWithholdingFromStatusAlone: true,
      neverRequestPasswordsPasscodesOtpsTokensPrivateKeysRecoveryCodesSessionIdsOrSystemCredentials: true,
      requireVerifiedAuthorityForJurisdictionSpecificCustodyDispositionRetentionAndLegalConclusions: true,
    }))

    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      categories: [
        'destruction-disposal-and-authorization-records',
        'evidence-system-audit-and-access-history',
        'status-and-custodial-location-history',
        'laboratory-forensic-and-external-transfer-records',
        'redaction-withholding-and-missing-records',
      ],
    })
    const corpus = request.items.map((item) => item.description).join(' ')
    expect(corpus).toContain('is not by itself proof that destruction or disposal occurred')
    expect(corpus).toContain('do not request passwords, OTPs, tokens, private keys')
    expect(corpus).toContain('without seeking secure-facility layouts')
    expect(corpus).toContain('does not by itself establish that testing occurred')
    expect(corpus).toContain('do not infer that an item was lost, destroyed, concealed, tampered with, or unlawfully withheld')
  })

  it('requires jurisdiction before applying evidence access and disposition rules', () => {
    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      categories: ['evidence-and-property-inventory'],
    })
    const issues = evidencePropertyRoomRecordsWorkflow.validate(request)
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'jurisdiction' })]))
  })

  it('flags missing custody and disposition records in a partial production without live LLMs', async () => {
    const request = buildEvidencePropertyRoomRecordsRequest({
      agency: 'Example Police Department',
      jurisdiction: 'California',
      incidentNumber: '2026-5001',
      evidenceNumber: 'EV-44',
      dateStart: '2026-01-01',
      dateEnd: '2026-09-01',
      itemDescription: 'mobile phone submitted as evidence',
      categories: [
        'evidence-and-property-inventory',
        'chain-of-custody-and-transfer-history',
        'release-return-and-disposition-records',
      ],
    })

    const analysis = await evidencePropertyRoomRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [{
        id: 'r1',
        filename: 'inventory.pdf',
        category: 'evidence-and-property-inventory',
        text: 'Evidence item EV-44 inventory. Chain of custody and disposition records are referenced but not included. Portions were redacted.',
      }],
    }) as { missingCategoryIds: string[]; findings: Array<{ type: string }> }

    expect(analysis.missingCategoryIds).toContain('chain-of-custody-and-transfer-history')
    expect(analysis.missingCategoryIds).toContain('release-return-and-disposition-records')
    expect(analysis.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'PARTIAL_PRODUCTION' }),
      expect.objectContaining({ type: 'REDACTION_REVIEW' }),
      expect.objectContaining({ type: 'REFERENCED_RECORD_NOT_PRODUCED' }),
    ]))
  })
})
