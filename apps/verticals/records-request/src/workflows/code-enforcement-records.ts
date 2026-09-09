import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import {
  analyzeCodeEnforcementProduction,
  type ProductionRecord,
  type RequestedCategory,
} from './code-enforcement-analysis'
import {
  assessContradiction,
  classifyProductionRecord,
  extractCodeEnforcementFacts,
  runCodeEnforcementStrategy,
} from './code-enforcement-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'
import { buildCodeEnforcementFollowUps } from './code-enforcement-follow-up'
import { buildCodeEnforcementAuthorityProfile } from './code-enforcement-authority'

export const CODE_ENFORCEMENT_RECORD_CATEGORIES = [
  'case-file',
  'violations',
  'complaints',
  'inspections',
  'notices-and-orders',
  'photographs-and-video',
  'correspondence',
  'enforcement-actions',
  'abatement-and-compliance',
  'permits-and-related-records',
] as const

export const CODE_ENFORCEMENT_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const CODE_ENFORCEMENT_INTAKE = [
  { id: 'agency', label: 'Agency', required: true, helpText: 'The city, county, department, district, or other records custodian.' },
  {
    id: 'jurisdiction',
    label: 'State / jurisdiction',
    required: true,
    helpText: 'State, county, city, tribe, territory, or other jurisdiction relevant to public-records, inspection, enforcement, hearing, lien, warrant, service, appeal, and retention rules.',
  },
  { id: 'department', label: 'Likely department or custodian', helpText: 'Code enforcement, building, planning, neighborhood services, environmental health, public works, or another likely custodian.' },
  { id: 'propertyAddress', label: 'Property address', helpText: 'Exact site address, including unit or suite where relevant.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Assessor parcel number or other parcel identifier when known.' },
  { id: 'caseNumber', label: 'Code enforcement case number', helpText: 'Case, complaint, violation, investigation, or file number when known.' },
  { id: 'violationNumber', label: 'Violation / citation number', helpText: 'Citation, violation, notice, order, hearing, or enforcement number when known.' },
  { id: 'relatedParty', label: 'Related person or entity', helpText: 'Owner, operator, business, tenant, complainant, contractor, or other entity associated with the matter when appropriate for identifying records.' },
  { id: 'dateStart', label: 'Records start date', required: true, helpText: 'Beginning of the requested records period.' },
  { id: 'dateEnd', label: 'Records end date', required: true, helpText: 'End of the requested records period.' },
  {
    id: 'subjectMatter',
    label: 'Issue or subject matter',
    required: true,
    helpText: 'Plain-English description of the code issue or enforcement matter. Describe the issue without assuming that an allegation, notice, inspection conclusion, citation, or agency position is legally correct or final.',
  },
  {
    id: 'requesterAccessContext',
    label: 'Requester / access context',
    helpText: 'Optional context such as public requester, owner, tenant, occupant, business operator, authorized representative, counsel, journalist, or other status. Access and procedural rights must be verified separately.',
  },
  {
    id: 'preferredFormat',
    label: 'Preferred production format',
    helpText: 'Optional preference such as searchable PDF, native media, email export, CSV, spreadsheet, or other structured format where maintained and lawfully producible.',
  },
  {
    id: 'narrowingNotes',
    label: 'Narrowing instructions',
    helpText: 'Optional limits such as identified case/parcel/notice numbers, named custodians, record classes, or a specific inspection/enforcement period.',
  },
  {
    id: 'exclusions',
    label: 'Exclusions / privacy and security limits',
    helpText: 'Optional exclusions such as unrelated properties, private complainant/contact data, medical information, unrelated personnel records, credentials, access-control details, or unrelated investigations.',
  },
  { id: 'priorRequestDate', label: 'Prior request date', helpText: 'Optional date of an earlier public-records request.' },
  { id: 'agencyRequestNumber', label: 'Agency request / tracking number', helpText: 'Optional public-records request or agency tracking number.' },
  { id: 'agencyResponseDate', label: 'Agency response date', helpText: 'Optional date of the latest agency response or production.' },
  {
    id: 'releaseStatus',
    label: 'Known request / case status',
    helpText: 'Optional exact status stated by the agency, such as open, closed, pending, referred, corrected, abated, appealed, stayed, partial production, withheld, denied, or no records located. Preserve the source wording.',
  },
] as const

function value(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed || undefined
}

function buildCategories(input: Record<string, unknown>): string[] {
  const requested = input.categories
  if (!Array.isArray(requested)) return [...CODE_ENFORCEMENT_RECORD_CATEGORIES]
  const known = new Set(CODE_ENFORCEMENT_RECORD_CATEGORIES)
  const selected = requested.filter(
    (entry): entry is string =>
      typeof entry === 'string' && known.has(entry as typeof CODE_ENFORCEMENT_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...CODE_ENFORCEMENT_RECORD_CATEGORIES]
}

function requestLimits(input: Record<string, unknown>): string {
  const narrowing = value(input, 'narrowingNotes')
  const exclusions = value(input, 'exclusions')
  return [
    narrowing && ` Narrowing instructions: ${narrowing}.`,
    exclusions && ` Exclude or segregate unrelated/sensitive material as follows: ${exclusions}.`,
  ].filter(Boolean).join('')
}

function descriptionForCategory(category: string, input: Record<string, unknown>): string {
  const property = value(input, 'propertyAddress')
  const parcel = value(input, 'parcelNumber')
  const caseNumber = value(input, 'caseNumber')
  const violation = value(input, 'violationNumber')
  const relatedParty = value(input, 'relatedParty')
  const start = value(input, 'dateStart')
  const end = value(input, 'dateEnd')
  const subject = value(input, 'subjectMatter')
  const identifiers = [
    property && `property address ${property}`,
    parcel && `parcel/APN ${parcel}`,
    caseNumber && `case number ${caseNumber}`,
    violation && `violation/citation number ${violation}`,
    relatedParty && `related person or entity ${relatedParty}`,
  ].filter(Boolean)
  const scope = identifiers.length ? ` Search using the following identifiers: ${identifiers.join('; ')}.` : ''
  const dates = start && end ? ` Cover records from ${start} through ${end}.` : ''
  const subjectText = subject ? ` Matter description supplied for identification only: ${subject}.` : ''
  const limits = requestLimits(input)

  const descriptions: Record<string, string> = {
    'case-file': `The code-enforcement case/file record, including existing indexing, routing, assignment, status history, intake, referrals, chronology, attachments, closure/reopening records, and records sufficient to understand the matter, to the extent maintained and lawfully disclosable. Preserve open, pending, referred, inactive, corrected, superseded, appealed, stayed, closed, reopened, and other exact recorded states. A case-file entry or status code is agency-recorded evidence, not by itself proof that an alleged violation existed, that service was legally sufficient, or that enforcement was lawful.${scope}${dates}`,
    violations: `Violation notices, alleged violation descriptions, citations, code sections cited, correction requirements, status records, amendments, withdrawals, dismissals, superseding notices, hearing outcomes, and final agency dispositions tied to the matter. Preserve allegation, notice, citation, administrative finding, appeal/review, and adjudicated outcome as distinct states; do not treat issuance of a notice or citation as conclusive proof of a violation, guilt, liability, or final enforceability.${scope}${dates}`,
    complaints: `Complaints, service requests, referrals, intake records, complaint narratives, routing records, and associated non-secret metadata relating to the matter, to the extent lawfully disclosable. Preserve complaint statements as source-attributed allegations rather than verified facts. Do not assume complainant identity, home/contact information, victim/witness information, confidential-source information, or authentication data is publicly disclosable.${scope}${dates}`,
    inspections: `Inspection requests, scheduling/status records, inspection reports, inspector observations, field notes, photographs referenced by inspections, reinspection records, corrections, and inspection outcomes. Preserve requested, scheduled, attempted, completed, cancelled, corrected, preliminary, and final states where recorded. Distinguish direct observations from conclusions or code interpretations, and do not infer consent, lawful entry, warrant authority, exigency, refusal, obstruction, or inspection legality unless supported by responsive records and verified authority.${scope}${dates}`,
    'notices-and-orders': `Notices, orders, correction notices, administrative orders, hearing notices, service records, proofs or declarations of service, amendments, stays, withdrawals, rescissions, appeals, and later orders relating to the matter. Preserve issued, served, attempted-service, stayed, appealed, amended, superseded, rescinded, final, and other exact states. Do not infer valid service, finality, enforceability, waiver, default, or deadline consequences solely from a document date or agency notation without verified authority and applicable facts.${scope}${dates}`,
    'photographs-and-video': `Photographs, video, body-worn or field media where maintained in the code-enforcement file, and associated non-secret file identifiers, timestamps, indexes, and metadata where lawfully disclosable. Preserve provenance and whether media is original, derivative, annotated, cropped, exported, or referenced when the records show it. Do not infer location, date, authorship, authenticity, completeness, code violation, or legal significance beyond what the media and reliable metadata support, and do not request passwords, hidden storage paths, access tokens, camera-security configuration, or unrelated private footage.${scope}${dates}`,
    correspondence: `Correspondence and communications concerning the enforcement matter, including letters, emails, attachments, message records, notices of communication, and documented exchanges between the agency and identified parties within the requested scope. Preserve sender, recipient, date, attachment, draft/final, and quoted-versus-authored distinctions where available. Do not treat an agency or third-party statement in correspondence as an adjudicated fact or legal conclusion merely because it appears in the file.${scope}${dates}`,
    'enforcement-actions': `Existing records of enforcement steps, citations, hearings, administrative decisions, referrals, warrants or warrant applications where part of the responsive file, liens or lien-related records, penalties, collection/referral actions, and other documented enforcement activity. Preserve proposed, requested, authorized, issued, served, filed, recorded, stayed, appealed, modified, vacated, withdrawn, satisfied, released, and final states distinctly. Do not infer warrant issuance from an application, lien validity from a reference, finality from an initial decision, or legal entitlement to enter, seize, fine, abate, or collect without the controlling record and verified authority.${scope}${dates}`,
    'abatement-and-compliance': `Abatement, correction, compliance, reinspection, extension, work-plan, closure, payment, satisfaction, release, or other resolution records relating to the matter. Preserve claimed, reported, inspected, verified, partially completed, extended, disputed, accepted, rejected, closed, reopened, and final states where recorded. A party's statement of correction or an agency status entry does not by itself prove physical compliance, noncompliance, causation, liability, or final closure.${scope}${dates}`,
    'permits-and-related-records': `Permits, applications, plan references, inspection records, certificates, approvals, denials, expiration/status records, and related property/building records that are part of or directly referenced by the enforcement matter. Preserve application, issued, approved, denied, expired, revoked, finaled, closed, corrected, and superseded states. Do not infer that work was lawful merely because a permit record exists, or unlawful merely because a permit was not located, without verified scope, date, jurisdiction, and controlling authority.${scope}${dates}`,
  }

  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${dates}`}${subjectText}${limits}`
}

function validateCodeEnforcement(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const scope = request.items
  const corpus = scope.map((item) => item.description.toLowerCase()).join(' ')
  const hasProperty = corpus.includes('property address') || corpus.includes('parcel/apn')
  const hasCase = corpus.includes('case number') || corpus.includes('violation/citation number')
  const hasSubject = corpus.includes('matter description supplied for identification only:')
  if (!hasProperty && !hasCase) {
    issues.push({ field: 'identifiers', message: 'Provide a property/parcel identifier, case number, or violation/citation number so the agency can identify the enforcement matter.' })
  }
  if (!hasSubject) {
    issues.push({ field: 'subjectMatter', message: 'Describe the code issue or enforcement matter so the request is intelligible and searchable.' })
  }
  if (!request.jurisdiction?.trim()) {
    issues.push({ field: 'jurisdiction', message: 'Provide the jurisdiction before applying records, inspection, enforcement, hearing, lien, warrant, service, appeal, or retention rules.' })
  }
  if (!scope.some((item) => item.category === 'case-file') && !corpus.includes('narrowing instructions:')) {
    issues.push({ field: 'categories', message: 'Include the case-file category for a flagship matter request, or add explicit narrowing instructions explaining the deliberately narrower scope.' })
  }
  return issues
}

export function buildCodeEnforcementRequest(input: Record<string, unknown>) {
  const agency = value(input, 'agency') ?? ''
  const property = value(input, 'propertyAddress')
  const parcel = value(input, 'parcelNumber')
  const caseNumber = value(input, 'caseNumber')
  const violation = value(input, 'violationNumber')
  const subject = value(input, 'subjectMatter')
  const start = value(input, 'dateStart')
  const end = value(input, 'dateEnd')
  const categories = buildCategories(input)
  return {
    title: `Code Enforcement Records — ${property ?? caseNumber ?? subject ?? 'Matter'}`,
    agency,
    jurisdiction: value(input, 'jurisdiction'),
    purpose:
      value(input, 'purpose') ??
      'Identify, preserve, obtain, and compare code-enforcement case, complaint, inspection, notice/order, media, correspondence, enforcement, compliance, permit, request-status, and related records while preserving exact source and procedural status.',
    scope: JSON.stringify({
      workflow: 'code-enforcement-records',
      intakeVersion: '2.0.0',
      propertyAddress: property,
      parcelNumber: parcel,
      caseNumber,
      violationNumber: violation,
      relatedParty: value(input, 'relatedParty'),
      department: value(input, 'department'),
      jurisdiction: value(input, 'jurisdiction'),
      dateStart: start,
      dateEnd: end,
      subjectMatter: subject,
      requesterAccessContext: value(input, 'requesterAccessContext'),
      preferredFormat: value(input, 'preferredFormat'),
      narrowingNotes: value(input, 'narrowingNotes'),
      exclusions: value(input, 'exclusions'),
      priorRequestDate: value(input, 'priorRequestDate'),
      agencyRequestNumber: value(input, 'agencyRequestNumber'),
      agencyResponseDate: value(input, 'agencyResponseDate'),
      releaseStatus: value(input, 'releaseStatus'),
    }),
    items: categories.map((category) => ({
      category,
      description: descriptionForCategory(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: value(input, 'department'),
      systemHint:
        category === 'photographs-and-video'
          ? 'code-enforcement field media / inspection systems'
          : category === 'case-file' || category === 'violations' || category === 'inspections'
            ? 'code-enforcement / permitting / inspection case-management system'
            : undefined,
      format:
        value(input, 'preferredFormat') ??
        (category === 'photographs-and-video'
          ? 'native digital files where available, with associated non-secret metadata preserved separately'
          : undefined),
    })),
  }
}

const ANALYSIS_FINDING_TYPES = [
  'MISSING_REQUESTED_CATEGORY',
  'REFERENCED_RECORD_NOT_PRODUCED',
  'IDENTIFIER_MISMATCH',
  'DATE_GAP',
  'DUPLICATE_RECORD',
  'MISSING_ATTACHMENT',
  'UNEXPLAINED_REDACTION',
  'PARTIAL_PRODUCTION',
  'UNRESPONSIVE_ITEM',
  'PRODUCTION_AMBIGUITY',
] as const

function normalizeRequestedCategories(items: readonly { category: string; description: string }[]): RequestedCategory[] {
  return items.map((item) => ({
    id: item.category,
    label: item.category,
    keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 12),
  }))
}

export const codeEnforcementRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'code-enforcement-records',
  name: 'Code Enforcement Records',
  description:
    'Build a targeted records request for code-enforcement case files, alleged violations, complaints, inspections, notices/orders, media, correspondence, enforcement actions, compliance/abatement, permits, and response evidence without turning agency records into unsupported findings, finality, or legal conclusions.',
  searchIntent: 'code enforcement records request',
  seo: {
    title: 'Code Enforcement Records Request',
    description: 'Build a targeted code enforcement records request for a property, parcel, violation, complaint, inspection, notice, order, or enforcement case.',
    canonicalPath: '/workflows/code-enforcement-records',
  },
  intakeVersion: '2.0.0',
  intake: CODE_ENFORCEMENT_INTAKE,
  capabilities: CODE_ENFORCEMENT_CAPABILITIES,
  request: { categories: CODE_ENFORCEMENT_RECORD_CATEGORIES, build: buildCodeEnforcementRequest },
  validate: validateCodeEnforcement,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      preserveComplaintAllegationObservationAgencyConclusionFindingAndAdjudicationDistinctions: true,
      doNotTreatComplaintNoticeCitationOrCaseStatusAsConclusiveViolationProof: true,
      preserveInspectionRequestedScheduledAttemptedCompletedCancelledCorrectedAndFinalStates: true,
      doNotInferConsentLawfulEntryWarrantAuthorityExigencyRefusalOrObstruction: true,
      preserveNoticeOrderServiceStayAppealAmendmentRescissionAndFinalityStates: true,
      doNotInferValidServiceWaiverDefaultFinalityOrDeadlineConsequenceFromDocumentDateAlone: true,
      preserveMediaProvenanceAndOriginalDerivativeAnnotatedExportedStatus: true,
      doNotInferMediaAuthenticityCompletenessLocationDateOrViolationWithoutSupportingEvidence: true,
      preserveEnforcementRequestedAuthorizedIssuedServedFiledRecordedStayedAppealedModifiedVacatedWithdrawnAndFinalStates: true,
      doNotInferWarrantIssuanceLienValidityOrEnforcementAuthorityFromReferenceAlone: true,
      preserveClaimedInspectedVerifiedDisputedClosedAndReopenedComplianceStates: true,
      doNotInferPhysicalComplianceNoncomplianceLiabilityOrFinalClosureFromStatusAlone: true,
      preservePermitApplicationIssuedDeniedExpiredRevokedFinaledAndSupersededStates: true,
      doNotInferLegalityOrIllegalityFromPermitPresenceOrAbsenceAlone: true,
      protectComplainantVictimWitnessJuvenileMedicalHomeContactPersonnelAndConfidentialSourceData: true,
      neverRequestPasswordsOtpsTokensPrivateKeysRecoveryCodesHiddenStoragePathsOrSystemCredentials: true,
      neverInventPropertyOwnershipOccupancyCaseFactsViolationsInspectionAuthorityServiceWarrantsLiensHearingsAppealsOrRequestStatus: true,
      neverInventDeadlinesExemptionsPrivilegesInspectionRightsEntryRightsHearingRightsAppealRightsOrAccessEntitlement: true,
      requireVerifiedAuthorityForJurisdictionSpecificRecordsInspectionEnforcementServiceWarrantLienDeadlineAndAppealConclusions: true,
      requireHumanReviewForConsequentialPrivacyInspectionEntryServiceFinalityLienWarrantDeadlineAndLegalAmbiguity: true,
    },
  }],
  responseAnalysis: {
    findingTypes: ANALYSIS_FINDING_TYPES,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as {
        requestedItems?: readonly { category: string; description: string }[]
        records?: readonly ProductionRecord[]
        propertyAddress?: string
        parcelNumber?: string
        caseNumber?: string
        violationNumber?: string
        dateStart?: string
        dateEnd?: string
        likelyCustodians?: string[]
        jurisdiction?: string
        agency?: string
        purpose?: string
        releaseStatus?: string
      }
      const records = source.records ?? []
      const requested = normalizeRequestedCategories(source.requestedItems ?? [])
      const deterministic = analyzeCodeEnforcementProduction(requested, records)
      const authorityProfile = buildCodeEnforcementAuthorityProfile({
        jurisdiction: source.jurisdiction,
        agency: source.agency,
        purpose: source.purpose,
        identifiers: {
          caseNumbers: source.caseNumber ? [source.caseNumber] : [],
          parcelNumbers: source.parcelNumber ? [source.parcelNumber] : [],
          addresses: source.propertyAddress ? [source.propertyAddress] : [],
        },
      })
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) {
        throw new Error(`CODE_ENFORCEMENT_LLM_QUORUM_NOT_MET:${providers.length}/2`)
      }
      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const analyzedRecords = await Promise.all(
        records.slice(0, 25).map(async (record) => ({
          id: record.id,
          classification: await classifyProductionRecord(providers, record, policy),
          facts: await extractCodeEnforcementFacts(providers, record, policy),
        })),
      )
      const contradictionPairs: {
        leftId: string
        rightId: string
        result: Awaited<ReturnType<typeof assessContradiction>>
      }[] = []
      const pairLimit = Math.min(records.length, 8)
      for (let i = 0; i < pairLimit; i += 1) {
        for (let j = i + 1; j < pairLimit; j += 1) {
          contradictionPairs.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessContradiction(providers, records[i], records[j], policy),
          })
        }
      }
      const ai = await runCodeEnforcementStrategy({
        workflow: 'code-enforcement-records',
        evidentiaryRules: {
          complaintIsAllegationNotFinding: true,
          inspectorObservationIsDistinctFromLegalConclusion: true,
          noticeOrCitationIsNotFinalAdjudication: true,
          documentDateDoesNotEstablishValidServiceOrDeadline: true,
          warrantApplicationOrReferenceDoesNotEstablishIssuance: true,
          complianceStatusDoesNotEstablishPhysicalCondition: true,
          permitPresenceOrAbsenceDoesNotAloneEstablishLegality: true,
        },
        requestedItems: source.requestedItems ?? [],
        authorityProfile,
        productionSummary: {
          recordsReviewed: deterministic.recordsReviewed,
          findings: deterministic.findings,
          coveredCategoryIds: deterministic.coveredCategoryIds,
          missingCategoryIds: deterministic.missingCategoryIds,
          identifierReconciliation: deterministic.identifierReconciliation,
        },
        records: records.slice(0, 25).map((record) => ({
          id: record.id,
          filename: record.filename,
          category: record.category,
          text: record.text ?? '',
        })),
        extractedFacts: analyzedRecords.map((item) => ({
          id: item.id,
          classification: item.classification.value,
          facts: item.facts.value,
        })),
        contradictions: contradictionPairs
          .filter((item) => item.result.value.contradictory)
          .map((item) => ({
            leftId: item.leftId,
            rightId: item.rightId,
            analysis: item.result.value,
          })),
        requestStatus: source.releaseStatus,
      })
      const followUps = buildCodeEnforcementFollowUps(deterministic.findings, {
        propertyAddress: source.propertyAddress,
        parcelNumber: source.parcelNumber,
        caseNumber: source.caseNumber,
        violationNumber: source.violationNumber,
        dateStart: source.dateStart,
        dateEnd: source.dateEnd,
        likelyCustodians: [...authorityProfile.likelyCustodianRoles, ...(source.likelyCustodians ?? [])],
      })
      return {
        ...deterministic,
        authorityProfile,
        aiStrategy: ai.value,
        aiProvenance: {
          providers: ai.providers,
          agreement: ai.confidence,
          disagreements: ai.disagreements,
          warnings: ai.warnings,
        },
        aiRecordAnalysis: analyzedRecords.map((item) => ({
          id: item.id,
          classification: item.classification.value,
          facts: item.facts.value,
          classificationProvenance: item.classification.providers,
          factProvenance: item.facts.providers,
        })),
        aiContradictions: contradictionPairs
          .filter((item) => item.result.value.contradictory)
          .map((item) => ({
            leftId: item.leftId,
            rightId: item.rightId,
            analysis: item.result.value,
            providers: item.result.providers,
          })),
        followUps,
      }
    },
  },
})
