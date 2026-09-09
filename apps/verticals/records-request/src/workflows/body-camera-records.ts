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

export const BODY_CAMERA_RECORD_CATEGORIES = [
  'body-camera-recordings',
  'body-camera-metadata',
  'activation-and-event-logs',
  'audit-and-access-logs',
  'retention-and-deletion-records',
  'redaction-and-withholding-records',
  'dispatch-and-cad',
  'incident-and-supplemental-reports',
  'evidence-indexes',
  'related-correspondence',
  'request-status-and-release-records',
] as const

export const BODY_CAMERA_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const BODY_CAMERA_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police department, sheriff, state police, campus police, transit police, or other public agency that may hold the recording.' },
  { id: 'jurisdiction', label: 'Jurisdiction', required: true, helpText: 'Federal, state, county, city, district, campus, transit, or other jurisdiction whose access and records rules may apply.' },
  { id: 'department', label: 'Likely records / evidence unit', helpText: 'Records, evidence, digital evidence, professional standards, investigations, or another likely custodian.' },
  { id: 'incidentDate', label: 'Incident date', required: true, helpText: 'Date of the encounter or incident.' },
  { id: 'timeStart', label: 'Approximate start time', helpText: 'Beginning of the encounter window when known.' },
  { id: 'timeEnd', label: 'Approximate end time', helpText: 'End of the encounter window when known.' },
  { id: 'incidentNumber', label: 'Incident / report / CAD number', helpText: 'Case, report, CAD, call-for-service, event, citation, or other identifier when known.' },
  { id: 'location', label: 'Incident location', required: true, helpText: 'Address, intersection, business, parcel, facility, road segment, or other specific location.' },
  { id: 'person', label: 'Person / entity involved', helpText: 'Requester-supplied name of a subject, reporting party, victim, witness, caller, business, or other involved person/entity when lawfully appropriate.' },
  { id: 'officerNames', label: 'Officer / unit identifiers', helpText: 'Known officer names, badge numbers, unit numbers, vehicle/unit identifiers, or roles.' },
  { id: 'subjectMatter', label: 'What happened', required: true, helpText: 'Plain-English description of the encounter. Describe disputed allegations as allegations rather than established facts.' },
  { id: 'requesterRelationship', label: 'Requester relationship / access context', helpText: 'Optional requester-supplied context such as involved party, parent/guardian, attorney, insurer, media, researcher, or general public. This does not establish legal entitlement by itself.' },
  { id: 'preferredFormat', label: 'Preferred format', helpText: 'Native video and metadata where available, original digital files, CSV/JSON logs, PDF, or another available format.' },
  { id: 'exclusions', label: 'Scope exclusions / narrowing', helpText: 'Optional exclusions that reduce noise without changing the body-camera objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...BODY_CAMERA_RECORD_CATEGORIES]
  const known = new Set(BODY_CAMERA_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof BODY_CAMERA_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...BODY_CAMERA_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const parts = [
    text(input, 'incidentNumber') && `incident/report/CAD identifier ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `location ${text(input, 'location')}`,
    text(input, 'person') && `requester-supplied person/entity identifier ${text(input, 'person')}`,
    text(input, 'officerNames') && `officer/unit identifiers ${text(input, 'officerNames')}`,
    text(input, 'department') && `likely unit/custodian ${text(input, 'department')}`,
  ].filter(Boolean)
  const date = text(input, 'incidentDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const time = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  const format = text(input, 'preferredFormat') ? ` Preferred format: ${text(input, 'preferredFormat')}.` : ''
  const exclusions = text(input, 'exclusions') ? ` Scope exclusions/narrowing: ${text(input, 'exclusions')}.` : ''
  const relationship = text(input, 'requesterRelationship') ? ` Requester-supplied relationship/access context: ${text(input, 'requesterRelationship')} (not treated as verified entitlement unless established by applicable authority or agency records).` : ''
  return `${parts.length ? ` Search using these requester-supplied identifiers: ${parts.join('; ')}.` : ''}${date ? ` Incident date: ${date}${time}.` : ''}${format}${exclusions}${relationship}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Encounter description supplied by requester: ${text(input, 'subjectMatter')}. Preserve whether statements are allegations, reported observations, officer narratives/conclusions, arrests/citations, charges, dispositions, or adjudicated findings; do not convert the content of a recording or report into a broader established fact beyond what the record supports.` : ''
  const descriptions: Record<string, string> = {
    'body-camera-recordings': `Lawfully accessible body-worn camera recordings depicting or capturing the identified encounter, including separate recordings from each involved officer and responsive pre-event or post-event footage retained with the incident. Do not assume an unredacted version or unrelated private footage is publicly disclosable.${scope}`,
    'body-camera-metadata': `Lawfully accessible native metadata associated with responsive body-worn camera files, including recording identifiers, non-secret device/camera identifiers, officer assignment, capture timestamps, duration, upload timestamps, filenames, hashes where maintained, evidence references, and other metadata sufficient to identify and verify responsive files. Do not request passwords, tokens, private keys, internal server addresses, evidence-system credentials, or security-sensitive configuration.${scope}`,
    'activation-and-event-logs': `Lawfully accessible activation, deactivation, buffering, event, synchronization, upload, tagging, categorization, export, and other event records associated with responsive body-worn camera recordings. Request operational event history needed to evaluate completeness, not authentication secrets or security-control configuration.${scope}`,
    'audit-and-access-logs': `Lawfully accessible audit history showing viewing, export, copying, modification, redaction, sharing, download, or other handling events for responsive recordings where maintained. Request non-secret activity records only; do not demand credentials, access-control secrets, internal network details, or unrelated personnel/security data.${scope}`,
    'retention-and-deletion-records': `Existing retention classifications, retention-expiration records, deletion schedules, actual deletion-event records, preservation holds, litigation/preservation flags where lawfully accessible, and other records showing the maintained preservation status of responsive body-camera material. Do not infer deletion, spoliation, misconduct, or a legal violation unless supported by verified records and applicable authority.${scope}`,
    'redaction-and-withholding-records': `Existing records identifying redactions, withheld segments, redaction logs, redacted-export history, withholding determinations, and the agency's actually stated basis for material not produced. Preserve the stated basis rather than inventing an exemption, privilege, deadline, disclosure right, violation, or review route.${scope}`,
    'dispatch-and-cad': `Existing dispatch, CAD, call-for-service, unit assignment, timestamp, disposition, and related communications records that identify officers, units, locations, and time windows associated with the encounter where lawfully accessible.${scope}`,
    'incident-and-supplemental-reports': `Lawfully accessible incident, offense, arrest, supplemental, use-of-force, field-contact, citation, collision, or other reports associated with the encounter that can identify responsive recordings and involved personnel. An allegation, arrest, citation, or officer narrative is not an adjudicated finding merely because it appears in a police record.${scope}`,
    'evidence-indexes': `Lawfully accessible evidence indexes, digital-evidence inventories, media indexes, attachment lists, evidence/property references, file manifests, and cross-references showing body-camera files associated with the incident. Request record evidence sufficient to identify media, not evidence-system secrets or security-sensitive access details.${scope}`,
    'related-correspondence': `Lawfully accessible correspondence, case notes, emails, referrals, disclosure notes, supervisor/reviewer communications, and communications concerning preservation, review, redaction, release, or handling of responsive body-camera material. Do not assume privileged, confidential-source, victim/witness, juvenile, medical, personnel, deliberative, or security-sensitive material is public.${scope}`,
    'request-status-and-release-records': `Existing acknowledgment, request/search status, fee, clarification, transfer/referral, identity/access-verification requirement, no-records response, retention/deletion statement, production manifest, release/export record, partial-production notice, closure, and review/appeal instructions where actually stated. Preserve the agency's actual statement and do not invent access entitlement, completeness, deadlines, exemptions, or review rights.${scope}`,
  }
  return `${descriptions[category] ?? `Existing body-camera records concerning ${category}.${scope}`}${subject}`
}

function validateBodyCamera(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!request.agency?.trim()) issues.push({ field: 'agency', message: 'Identify the law-enforcement agency or public body.' })
  if (!request.jurisdiction?.trim()) issues.push({ field: 'jurisdiction', message: 'Identify the relevant jurisdiction.' })
  if (!corpus.includes('location ')) issues.push({ field: 'location', message: 'Provide the incident location so the agency can identify the encounter.' })
  if (!corpus.includes('incident date:')) issues.push({ field: 'incidentDate', message: 'Provide the incident date so responsive recordings can be located.' })
  if (!corpus.includes('encounter description supplied by requester:')) issues.push({ field: 'subjectMatter', message: 'Describe the encounter in plain language.' })
  return issues
}

export function buildBodyCameraRecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const location = text(input, 'location')
  const incidentDate = text(input, 'incidentDate')
  const subjectMatter = text(input, 'subjectMatter')
  const categories = selectedCategories(input)

  return {
    title: `Body Camera Records — ${incidentNumber ?? location ?? incidentDate ?? 'Incident'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and review lawfully accessible body-worn camera recordings and the metadata, logs, indexes, retention records, and release evidence needed to evaluate production completeness.',
    scope: JSON.stringify({
      workflow: 'body-camera-records',
      incidentDate,
      timeStart: text(input, 'timeStart'),
      timeEnd: text(input, 'timeEnd'),
      incidentNumber,
      location,
      person: text(input, 'person'),
      officerNames: text(input, 'officerNames'),
      department: text(input, 'department'),
      subjectMatter,
      requesterRelationship: text(input, 'requesterRelationship'),
      preferredFormat: text(input, 'preferredFormat'),
      exclusions: text(input, 'exclusions'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: incidentDate,
      dateEnd: incidentDate,
      custodian: text(input, 'department'),
      systemHint: category.includes('body-camera') || category.includes('activation') || category.includes('audit')
        ? 'body-worn camera / digital evidence management system'
        : category === 'dispatch-and-cad'
          ? 'CAD / call-for-service system'
          : undefined,
      format: text(input, 'preferredFormat') ?? (category === 'body-camera-recordings'
        ? 'native digital video files where available, with associated metadata preserved separately'
        : category === 'body-camera-metadata' || category.includes('logs')
          ? 'native export, CSV, JSON, or other structured format where maintained'
          : undefined),
    })),
  }
}

export const BODY_CAMERA_FINDINGS = [
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

export const bodyCameraRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'body-camera-records',
  name: 'Body Camera Records Request',
  description: 'Build a focused request for body-worn camera recordings, native metadata, activation/audit logs, retention records, redaction records, CAD, incident reports, evidence indexes, and request/release status.',
  searchIntent: 'body camera records request',
  seo: {
    title: 'Body Camera Records Request — Video, Metadata, Logs & Release Status',
    description: 'Request body-worn camera video plus metadata, activation and audit records, retention status, redaction records, CAD, reports, evidence indexes, and release-status records for a specific incident.',
    canonicalPath: '/workflows/body-camera-records',
  },
  intakeVersion: '2.0.0',
  intake: BODY_CAMERA_INTAKE,
  capabilities: BODY_CAMERA_CAPABILITIES,
  request: {
    categories: BODY_CAMERA_RECORD_CATEGORIES,
    build: buildBodyCameraRecordsRequest,
  },
  validate: validateBodyCamera,
  policies: [
    {
      jurisdiction: 'all',
      version: '2.0.0',
      rules: {
        requestNativeMediaAndMetadataSeparatelyWhereLawfullyAccessible: true,
        requestRetentionDeletionRedactionReleaseAndProductionStatusEvidence: true,
        preserveIncidentOfficerUnitPersonLocationTimeFormatAndRequesterRelationshipAsRequesterSuppliedUnlessVerified: true,
        preserveAllegationObservationNarrativeArrestCitationDispositionAndAdjudicationDistinctions: true,
        doNotTreatReferencedMediaAsProducedOrAssumeUnredactedMediaExistsOrIsDisclosable: true,
        doNotInventRecordingExistenceOfficerAssignmentActivationEventsRetentionDeletionPreservationStatusSearchCompletenessAgencyFactsOrRequestStatus: true,
        doNotAssertJurisdictionSpecificDeadlinesExemptionsPrivilegesDisclosureRightsReviewRightsAccessEntitlementSpoliationMisconductOrViolationsWithoutVerifiedAuthority: true,
        doNotTreatVictimWitnessJuvenileMedicalConfidentialSourcePersonnelPrivilegedDeliberativeLocationContactSecurityOrAuthenticationDataAsAutomaticallyPublic: true,
        doNotRequestPasswordsSecurityAnswersOneTimeCodesAuthenticationTokensPaymentCredentialsPrivateKeysInternalServerAddressesEvidenceSystemSecretsOrSecurityConfiguration: true,
        requireHumanReviewWhenConsequentialAccessPrivacyPrivilegeRetentionDeletionIdentityVerificationLegalOrSensitiveInformationQuestionIsUnclear: true,
      },
    },
  ],
  responseAnalysis: {
    findingTypes: BODY_CAMERA_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('BODY_CAMERA_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyPoliceRecord(providers, record, policy),
        facts: await extractPoliceIncidentFacts(providers, record, policy),
      })))

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

      const strategy = await recommendPoliceFollowUp(providers, {
        workflow: 'body-camera-records',
        deterministic,
        requestedItems: source.requestedItems ?? [],
        identifiers: source.identifiers ?? {},
        records: records.slice(0, 20).map((record) => ({ id: record.id, filename: record.filename, category: record.category, text: record.text ?? '' })),
        extracted: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value })),
        contradictions: contradictions.filter((item) => item.result.value.contradictory).map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value })),
      }, policy)

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
