import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import {
  analyzePoliceProduction,
  type PoliceProductionIdentifiers,
  type PoliceProductionRecord,
} from './police-records-analysis'
import {
  assessPoliceContradiction,
  classifyPoliceRecord,
  extractPoliceIncidentFacts,
  recommendPoliceFollowUp,
} from './police-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES = [
  'evidence-and-property-inventory',
  'chain-of-custody-and-transfer-history',
  'intake-booking-and-submission-records',
  'release-return-and-disposition-records',
  'destruction-disposal-and-authorization-records',
  'evidence-system-audit-and-access-history',
  'status-and-custodial-location-history',
  'laboratory-forensic-and-external-transfer-records',
  'policy-procedure-and-retention-schedule-records',
  'redaction-withholding-and-missing-records',
] as const

export const EVIDENCE_PROPERTY_ROOM_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification',
  'extraction',
  'deadline',
  'contradiction',
  'findings',
  'evidence',
  'research',
  'risk',
  'strategy',
  'draft',
  'draftProvenance',
  'validation',
  'review',
  'approval',
  'mailing',
  'tracking',
  'proofAudit',
]

export const EVIDENCE_PROPERTY_ROOM_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police, sheriff, state police, prosecutor, or other agency that received or maintained the evidence/property.' },
  {
    id: 'jurisdiction',
    label: 'State / jurisdiction',
    required: true,
    helpText: 'State, tribe, territory, federal jurisdiction, or other jurisdiction relevant to evidence access, privacy, retention, release, and disposition rules.',
  },
  { id: 'incidentNumber', label: 'Incident / report / case number', helpText: 'Police report, incident, criminal case, evidence, property, or court case number when known.' },
  { id: 'evidenceNumber', label: 'Evidence / property number', helpText: 'Evidence tag, property receipt, item number, barcode, submission number, or other non-secret identifier when known.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant custody period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant custody period.' },
  { id: 'person', label: 'Associated person', helpText: 'Owner, arrestee, victim, suspect, claimant, or other person associated with the item, if appropriate for identifying the records.' },
  {
    id: 'itemDescription',
    label: 'Evidence / property description',
    required: true,
    helpText: 'Plain-English description of the item, media, device, sample, document, or property. Do not provide passwords, device passcodes, recovery keys, authentication tokens, or unrelated private content.',
  },
  { id: 'custodianUnit', label: 'Evidence / property unit', helpText: 'Evidence room, property unit, laboratory liaison, records unit, or other known custodian.' },
  {
    id: 'requesterAccessContext',
    label: 'Requester / access context',
    helpText: 'Optional context such as public requester, owner/claimant, defendant, victim, authorized representative, counsel, or other status. Access rights must be verified separately.',
  },
  {
    id: 'preferredFormat',
    label: 'Preferred production format',
    helpText: 'Optional preference such as searchable PDF or structured inventory/custody export where maintained and lawfully producible.',
  },
  {
    id: 'narrowingNotes',
    label: 'Narrowing instructions',
    helpText: 'Optional limits such as identified evidence numbers, custody period, transaction types, laboratories, or specific record classes.',
  },
  {
    id: 'exclusions',
    label: 'Exclusions / security and privacy limits',
    helpText: 'Optional exclusions such as secure-facility layouts, access-control details, credentials, unrelated user activity, unrelated evidence, private medical/genetic data, victim/witness details, or unrelated personal information.',
  },
  { id: 'priorRequestDate', label: 'Prior request date', helpText: 'Optional date of an earlier records request.' },
  { id: 'agencyRequestNumber', label: 'Agency request / tracking number', helpText: 'Optional public-records request or agency tracking number.' },
  { id: 'agencyResponseDate', label: 'Agency response date', helpText: 'Optional date of the latest agency response or production.' },
  {
    id: 'releaseStatus',
    label: 'Known request / item status',
    helpText: 'Optional exact status stated by the agency, such as in custody, transferred, released, returned, authorized for destruction, destroyed, missing, pending review, partial production, withheld, or no records located. Preserve the source wording.',
  },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES]
  const known = new Set(EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string =>
      typeof entry === 'string' && known.has(entry as typeof EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'incidentNumber') && `incident/report/case number ${text(input, 'incidentNumber')}`,
    text(input, 'evidenceNumber') && `evidence/property identifier ${text(input, 'evidenceNumber')}`,
    text(input, 'person') && `associated person ${text(input, 'person')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function requestLimits(input: Record<string, unknown>): string {
  const narrowing = text(input, 'narrowingNotes')
  const exclusions = text(input, 'exclusions')
  return [
    narrowing && ` Narrowing instructions: ${narrowing}.`,
    exclusions && ` Exclude or segregate unrelated/sensitive material as follows: ${exclusions}.`,
  ].filter(Boolean).join('')
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const limits = requestLimits(input)
  const item = text(input, 'itemDescription') ? ` Evidence/property description supplied for identification only: ${text(input, 'itemDescription')}.` : ''
  const descriptions: Record<string, string> = {
    'evidence-and-property-inventory': `Evidence/property inventory records, item lists, receipts, evidence tags, property records, barcode or item identifiers, item descriptions, quantity/status fields, and records sufficient to identify each responsive item associated with the matter. Preserve each field as recorded system or document evidence; an inventory entry alone does not establish authenticity, ownership, evidentiary value, current possession, or an unbroken chain of custody.${scope}`,
    'chain-of-custody-and-transfer-history': `Chain-of-custody records, transfer logs, checkout/check-in history, custody acknowledgments, handoff records, transfer dates/times, non-secret responsible-person identifiers where lawfully disclosable, and records sufficient to reconstruct the documented custody sequence for each responsive item. Preserve gaps, corrections, duplicate entries, and uncertain transitions as documented conditions; do not infer tampering, substitution, contamination, loss, misconduct, or evidentiary invalidity from a gap or discrepancy without supporting evidence and verified authority.${scope}`,
    'intake-booking-and-submission-records': `Evidence/property intake records, booking records, submission forms, receiving records, packaging/submission documentation, initial condition/status records, and records identifying when and by whom responsive property was recorded as entering agency custody. Treat intake descriptions, submitter statements, source labels, owner fields, and condition notes as source-attributed records rather than conclusive proof of provenance, ownership, condition, or authenticity.${scope}`,
    'release-return-and-disposition-records': `Release, return, owner-notification, claimant, disposition, court-order compliance, transfer-out, and final-status records sufficient to show the exact recorded status, date, recipient or destination category, and documented authority for property leaving agency custody, to the extent lawfully disclosable. Preserve authorized, scheduled, pending, completed, cancelled, reversed, returned, transferred, and other distinct states rather than treating authorization as completed disposition.${scope}`,
    'destruction-disposal-and-authorization-records': `Destruction, disposal, forfeiture, abandonment, purge, or other disposition records; authorizations; approvals; notices; certificates; disposition logs; and records sufficient to distinguish proposed, authorized, scheduled, completed, cancelled, or corrected disposition of responsive property, to the extent lawfully disclosable. An authorization, eligibility code, retention expiration, or scheduled disposition is not by itself proof that destruction or disposal occurred; do not infer spoliation, unlawful destruction, forfeiture validity, or misconduct without supporting evidence and verified authority.${scope}`,
    'evidence-system-audit-and-access-history': `Evidence-management-system audit history, record-change history, item-status changes, documented checkout/check-in or access events, non-secret user/action identifiers, timestamps, and other audit records sufficient to identify material changes to the responsive item's record, where lawfully disclosable. Limit the request to responsive item activity and do not request passwords, OTPs, tokens, private keys, session identifiers, access-control configuration, internal network details, hidden storage paths, security logs unrelated to the item, or operational information that could facilitate unauthorized access.${scope}`,
    'status-and-custodial-location-history': `Status history and custodial-location history recorded for responsive items, including documented movement between custody categories, laboratories, courts, officers, authorized external recipients, or disposition statuses. Request functional custody/location categories and transaction history without seeking secure-facility layouts, vault/bin combinations, alarm details, access routes, door codes, badge-access rules, camera blind spots, or other physical-security information. A location/status entry is recorded custody evidence and does not by itself prove actual physical presence at every moment.${scope}`,
    'laboratory-forensic-and-external-transfer-records': `Laboratory submission forms, forensic-service requests, external-agency transfer records, courier/receipt records, return records, laboratory case or submission identifiers, status records, and records sufficient to correlate responsive property with outside testing or authorized transfer. Preserve requested, submitted, received, pending, preliminary, completed, returned, cancelled, and final-result states; a laboratory submission or case number does not by itself establish that testing occurred or that a particular result was reached.${scope}`,
    'policy-procedure-and-retention-schedule-records': `Evidence/property policies, chain-of-custody procedures, intake and release procedures, disposition/destruction requirements, audit requirements, retention schedules, and policies shown by the records to have been in effect during the relevant custody period. Preserve version and effective-date provenance. Comparing a transaction or custody record with policy does not itself establish admissibility, spoliation, negligence, misconduct, or any legal violation.${scope}`,
    'redaction-withholding-and-missing-records': `Retention classifications, preservation holds, deletion/destruction records for responsive data, redaction logs, withholding determinations, exemption records, privilege logs where maintained, unavailable/missing-item documentation, discrepancy reports, production/release logs, and records stating the basis for responsive material not produced. Preserve missing, unable-to-locate, transferred, destroyed, not-created, not-retained, withheld, and no-records-located statuses distinctly; do not infer that an item was lost, destroyed, concealed, tampered with, or unlawfully withheld solely from a missing-record notation or incomplete production.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${item}${limits}`
}

function validateEvidencePropertyRoom(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((entry) => entry.description.toLowerCase()).join(' ')
  if (!corpus.includes('evidence/property description supplied for identification only:')) {
    issues.push({ field: 'itemDescription', message: 'Describe the evidence or property in plain language.' })
  }
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the custody period.' })
  }
  if (
    !corpus.includes('incident/report/case number') &&
    !corpus.includes('evidence/property identifier') &&
    !corpus.includes('associated person')
  ) {
    issues.push({ field: 'identifiers', message: 'Provide at least one case/incident number, evidence/property identifier, or associated person.' })
  }
  if (!request.jurisdiction?.trim()) {
    issues.push({ field: 'jurisdiction', message: 'Provide the jurisdiction before applying evidence access, retention, release, disposition, or privacy rules.' })
  }
  return issues
}

export function buildEvidencePropertyRoomRecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const evidenceNumber = text(input, 'evidenceNumber')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Evidence & Property Records — ${evidenceNumber ?? incidentNumber ?? text(input, 'itemDescription') ?? 'Item'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose:
      text(input, 'purpose') ??
      'Identify, preserve, obtain, and compare evidence/property inventory, custody, intake, transfer, release/disposition, destruction authorization/completion, item-bounded audit history, status, laboratory, policy, retention, and withholding/release records while preserving exact custody and disposition states.',
    scope: JSON.stringify({
      workflow: 'evidence-property-room-records',
      intakeVersion: '2.0.0',
      jurisdiction: text(input, 'jurisdiction'),
      incidentNumber,
      evidenceNumber,
      dateStart: start,
      dateEnd: end,
      person: text(input, 'person'),
      itemDescription: text(input, 'itemDescription'),
      custodianUnit: text(input, 'custodianUnit'),
      requesterAccessContext: text(input, 'requesterAccessContext'),
      preferredFormat: text(input, 'preferredFormat'),
      narrowingNotes: text(input, 'narrowingNotes'),
      exclusions: text(input, 'exclusions'),
      priorRequestDate: text(input, 'priorRequestDate'),
      agencyRequestNumber: text(input, 'agencyRequestNumber'),
      agencyResponseDate: text(input, 'agencyResponseDate'),
      releaseStatus: text(input, 'releaseStatus'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'custodianUnit'),
      systemHint:
        category === 'evidence-and-property-inventory' ||
        category === 'chain-of-custody-and-transfer-history' ||
        category === 'evidence-system-audit-and-access-history' ||
        category === 'status-and-custodial-location-history'
          ? 'evidence / property management system'
          : category === 'laboratory-forensic-and-external-transfer-records'
            ? 'forensic submission / laboratory liaison system'
            : undefined,
      format:
        text(input, 'preferredFormat') ??
        (category === 'evidence-and-property-inventory' ||
        category === 'chain-of-custody-and-transfer-history' ||
        category === 'evidence-system-audit-and-access-history' ||
        category === 'status-and-custodial-location-history'
          ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : undefined),
    })),
  }
}

export const EVIDENCE_PROPERTY_ROOM_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY',
  'REFERENCED_RECORD_NOT_PRODUCED',
  'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP',
  'DUPLICATE_RECORD',
  'MISSING_MEDIA',
  'UNEXPLAINED_WITHHOLDING',
  'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION',
  'UNRESPONSIVE_ITEM',
] as const

export const evidencePropertyRoomRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'evidence-property-room-records',
  name: 'Evidence & Property Room Records Request',
  description:
    'Build an item-specific request for evidence/property inventory, chain of custody, intake, release/disposition, destruction authorization/completion, item-bounded audit history, custodial movement, laboratory transfers, policies, retention, and withholding/release evidence without turning gaps or status codes into unsupported tampering or spoliation conclusions.',
  searchIntent: 'police evidence property room records request',
  seo: {
    title: 'Evidence & Property Room Records Request — Chain of Custody & Disposition',
    description:
      'Request police evidence and property inventory, chain-of-custody, intake, transfer, release, destruction/disposition, audit-history, laboratory, retention, and withholding records.',
    canonicalPath: '/workflows/evidence-property-room-records',
  },
  intakeVersion: '2.0.0',
  intake: EVIDENCE_PROPERTY_ROOM_INTAKE,
  capabilities: EVIDENCE_PROPERTY_ROOM_CAPABILITIES,
  request: { categories: EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES, build: buildEvidencePropertyRoomRecordsRequest },
  validate: validateEvidencePropertyRoom,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      requestStructuredEvidenceSystemExportsWhereMaintained: true,
      requestChainOfCustodySeparately: true,
      preserveCustodyGapsCorrectionsDuplicatesAndUncertainTransitions: true,
      doNotInferTamperingSubstitutionContaminationLossOrInvalidityFromCustodyGapAlone: true,
      preserveIntakeDescriptionsAsSourceAttributedRecords: true,
      requestDispositionAndDestructionAuthoritySeparately: true,
      preserveAuthorizedScheduledCompletedCancelledAndCorrectedDispositionStates: true,
      doNotTreatDestructionAuthorizationRetentionExpiryOrScheduleAsProofOfDestruction: true,
      requestAuditHistoryLimitedToResponsiveItemActivity: true,
      requestAuditHistoryWithoutSecurityCredentialsOrFacilityAccessDetails: true,
      protectSecureFacilityLayoutAccessControlAlarmAndSurveillanceSecurityDetails: true,
      preserveRecordedCustodialLocationAsSystemEvidenceNotConclusivePhysicalPresence: true,
      preserveLaboratoryRequestedSubmittedPendingPreliminaryCompletedAndFinalStates: true,
      doNotTreatLaboratorySubmissionAsProofOfTestingOrResult: true,
      requestPoliciesEffectiveDuringCustodyPeriodWithVersionProvenance: true,
      doNotTreatPolicyComparisonAsAdmissibilitySpoliationMisconductOrLegalConclusion: true,
      requestDisclosableRecordsAndSegregablePortions: true,
      requestRetentionRedactionWithholdingMissingAndReleaseEvidence: true,
      preserveMissingTransferredDestroyedNotCreatedNotRetainedAndWithheldStatuses: true,
      doNotInferSpoliationUnlawfulDestructionConcealmentTamperingOrWithholdingFromStatusAlone: true,
      protectVictimWitnessJuvenileMedicalGeneticHomeContactAndUnrelatedPersonalData: true,
      neverRequestPasswordsPasscodesOtpsTokensPrivateKeysRecoveryCodesSessionIdsOrSystemCredentials: true,
      neverInventItemExistenceCustodyTransfersDispositionDestructionAuditEventsLabResultsOrRequestStatus: true,
      neverInventDeadlinesExemptionsPrivilegesDisclosureRightsOwnershipOrAccessEntitlement: true,
      requireVerifiedAuthorityForJurisdictionSpecificCustodyDispositionRetentionAndLegalConclusions: true,
      requireHumanReviewForConsequentialCustodyTamperingDispositionForensicPrivacyAndLegalityAmbiguity: true,
    },
  }],
  responseAnalysis: {
    findingTypes: EVIDENCE_PROPERTY_ROOM_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') {
        throw new Error('EVIDENCE_PROPERTY_ROOM_PRODUCTION_ANALYSIS_INPUT_INVALID')
      }
      const source = input as {
        requestedItems?: readonly { category: string; description: string }[]
        records?: readonly PoliceProductionRecord[]
        identifiers?: PoliceProductionIdentifiers
      }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzePoliceProduction(requested, records, source.identifiers ?? {})
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const analyzed = await Promise.all(
        records.slice(0, 20).map(async (record) => ({
          id: record.id,
          classification: await classifyPoliceRecord(providers, record, policy),
          facts: await extractPoliceIncidentFacts(providers, record, policy),
        })),
      )
      const contradictions: Array<{
        leftId: string
        rightId: string
        result: Awaited<ReturnType<typeof assessPoliceContradiction>>
      }> = []
      for (let i = 0; i < Math.min(records.length, 8); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 8); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessPoliceContradiction(providers, records[i], records[j], policy),
          })
        }
      }
      const strategy = await recommendPoliceFollowUp(
        providers,
        {
          workflow: 'evidence-property-room-records',
          evidentiaryRules: {
            custodyGapIsNotTamperingProof: true,
            intakeDescriptionIsSourceAttributed: true,
            authorizationIsNotCompletedDisposition: true,
            auditEntryIsRecordedSystemEvidence: true,
            locationStatusDoesNotEstablishContinuousPhysicalPresence: true,
            labSubmissionDoesNotEstablishTestingOrResult: true,
            statusCodeDoesNotEstablishSpoliationOrMisconduct: true,
          },
          deterministic,
          requestedItems: source.requestedItems ?? [],
          identifiers: source.identifiers ?? {},
          records: records.slice(0, 20).map((record) => ({
            id: record.id,
            filename: record.filename,
            category: record.category,
            text: record.text ?? '',
          })),
          extracted: analyzed.map((item) => ({
            id: item.id,
            classification: item.classification.value,
            facts: item.facts.value,
          })),
          contradictions: contradictions
            .filter((item) => item.result.value.contradictory)
            .map((item) => ({
              leftId: item.leftId,
              rightId: item.rightId,
              analysis: item.result.value,
            })),
        },
        policy,
      )

      return {
        ...deterministic,
        aiStrategy: strategy.value,
        aiProvenance: {
          providers: strategy.providers,
          confidence: strategy.confidence,
          disagreements: strategy.disagreements,
          warnings: strategy.warnings,
        },
        aiRecordAnalysis: analyzed.map((item) => ({
          id: item.id,
          classification: item.classification.value,
          facts: item.facts.value,
          classificationProvenance: item.classification.providers,
          factProvenance: item.facts.providers,
        })),
        aiContradictions: contradictions
          .filter((item) => item.result.value.contradictory)
          .map((item) => ({
            leftId: item.leftId,
            rightId: item.rightId,
            analysis: item.result.value,
            providers: item.result.providers,
          })),
      }
    },
  },
})
