import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzePropertyPermitProduction } from './property-permit-analysis'
import {
  assessPropertyPermitContradiction,
  classifyPropertyPermit,
  extractPropertyPermitFacts,
  runPropertyPermitStrategy,
} from './property-permit-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const PROPERTY_PERMIT_RECORD_CATEGORIES = [
  'building-permits',
  'permit-applications',
  'inspection-records',
  'approved-plans',
  'site-plans',
  'plan-review-comments',
  'correction-notices',
  'certificate-of-occupancy',
  'permit-history',
  'correspondence-and-notes',
] as const

export const PROPERTY_PERMIT_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const PROPERTY_PERMIT_INTAKE = [
  { id: 'agency', label: 'Agency / permitting authority', required: true, helpText: 'City, county, district, state office, or other permitting authority likely to maintain the records.' },
  {
    id: 'jurisdiction',
    label: 'State / jurisdiction',
    required: true,
    helpText: 'State and local jurisdiction relevant to permitting, inspection, plan access, records disclosure, retention, fees, and review/appeal rules.',
  },
  { id: 'department', label: 'Likely department / custodian', helpText: 'Building, planning, permits, inspections, public works, fire prevention, records, or another likely custodian.' },
  { id: 'address', label: 'Property address', helpText: 'Street address or other site identifier.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Parcel, APN, property ID, or assessor identifier when known.' },
  { id: 'permitNumber', label: 'Permit number', helpText: 'Permit, application, plan-review, inspection, or project number when known.' },
  { id: 'owner', label: 'Owner / applicant / project party', helpText: 'Owner, applicant, contractor, architect, engineer, tenant, or other associated party when useful for record identification. Do not infer legal ownership from an agency field without verification.' },
  { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
  { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
  {
    id: 'projectDescription',
    label: 'Project / subject matter',
    required: true,
    helpText: 'Plain-English description of the construction, alteration, occupancy, land-use, or permit matter without assuming approval, compliance, illegality, or final status.',
  },
  {
    id: 'requesterAccessContext',
    label: 'Requester / access context',
    helpText: 'Optional context such as public requester, owner, applicant, tenant, contractor, design professional, authorized representative, journalist, or counsel. Access rights must be verified separately.',
  },
  {
    id: 'preferredFormat',
    label: 'Preferred production format',
    helpText: 'Optional preference such as searchable PDF, native plan file, image, CSV, spreadsheet, or structured permit-system export where maintained and lawfully producible.',
  },
  {
    id: 'narrowingNotes',
    label: 'Narrowing instructions',
    helpText: 'Optional limits such as identified permits, plan versions, inspection dates, disciplines, record classes, or a specific project phase.',
  },
  {
    id: 'exclusions',
    label: 'Exclusions / privacy and security limits',
    helpText: 'Optional exclusions such as unrelated properties, private contact information, payment credentials, security-sensitive plan details, access-control information, medical data, or unrelated personnel records.',
  },
  { id: 'priorRequestDate', label: 'Prior request date', helpText: 'Optional date of an earlier public-records request.' },
  { id: 'agencyRequestNumber', label: 'Agency request / tracking number', helpText: 'Optional public-records request or agency tracking number.' },
  { id: 'agencyResponseDate', label: 'Agency response date', helpText: 'Optional date of the latest agency response or production.' },
  {
    id: 'releaseStatus',
    label: 'Known permit / request status',
    helpText: 'Optional exact status stated by the agency, such as applied, under review, corrections required, issued, expired, withdrawn, revoked, finaled, closed, partial production, withheld, or no records located. Preserve the source wording.',
  },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function categories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...PROPERTY_PERMIT_RECORD_CATEGORIES]
  const known = new Set(PROPERTY_PERMIT_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof PROPERTY_PERMIT_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...PROPERTY_PERMIT_RECORD_CATEGORIES]
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
  const identifiers = [
    text(input, 'permitNumber') && `permit number ${text(input, 'permitNumber')}`,
    text(input, 'address') && `property address ${text(input, 'address')}`,
    text(input, 'parcelNumber') && `parcel/APN ${text(input, 'parcelNumber')}`,
    text(input, 'owner') && `owner/applicant/project party ${text(input, 'owner')}`,
  ].filter(Boolean)
  const dates = text(input, 'dateStart') && text(input, 'dateEnd') ? ` Cover ${text(input, 'dateStart')} through ${text(input, 'dateEnd')}.` : ''
  const scope = identifiers.length ? ` Search using these identifiers: ${identifiers.join('; ')}.` : ''
  const project = text(input, 'projectDescription') ? ` Project description supplied for identification only: ${text(input, 'projectDescription')}.` : ''
  const limits = requestLimits(input)
  const descriptions: Record<string, string> = {
    'building-permits': `Building permits, issued permit documents, amendments, revisions, extensions, renewals, suspensions, revocations, expirations, final permit records, and records sufficient to show the agency-recorded permit status and applicable version for the identified property or project. Preserve application, issued, active, expired, suspended, revoked, withdrawn, finaled, closed, corrected, superseded, and other exact states. A permit record does not by itself prove that all work was performed, performed as approved, code-compliant, legally authorized in every respect, or currently lawful.${scope}${dates}`,
    'permit-applications': `Permit applications, intake records, applicant submissions, supplemental submissions, completeness/status records, revisions, withdrawals, and application metadata associated with the identified property or project. Preserve submitted, incomplete, accepted for review, under review, corrected, withdrawn, denied, approved, superseded, and other recorded states. An application, intake acceptance, fee payment, or application number is not proof that a permit was issued or the proposed work was approved.${scope}${dates}`,
    'inspection-records': `Inspection requests, scheduling records, inspection reports, inspector observations, inspection result codes, field notes, reinspections, corrections, cancellations, and related records for the identified project. Preserve requested, scheduled, attempted, completed, passed, failed, partial, cancelled, corrected, superseded, and final states exactly as recorded. Distinguish direct observations from code interpretations or conclusions, and do not infer lawful entry, consent, warrant authority, final code compliance, construction quality, causation, negligence, or legal liability from an inspection entry alone.${scope}${dates}`,
    'approved-plans': `Approved construction plans, drawings, specifications, calculations, plan sets, stamped sheets, revisions, and records sufficient to identify the exact plan version approved or accepted by the agency, to the extent maintained and lawfully disclosable. Preserve version, revision, discipline, approval/status, and supersession provenance. Approval of a plan version does not establish that construction followed that version, that later changes were approved, or that every depicted condition remains current or legally compliant. Do not assume security-sensitive, copyrighted, confidential, or otherwise restricted plan content is publicly releasable without verified authority.${scope}${dates}`,
    'site-plans': `Site plans, plot plans, grading plans, civil/site documentation, parcel exhibits, access or utility plans, and related plan versions associated with the identified project, to the extent maintained and lawfully disclosable. Preserve version and approval/status provenance and do not infer present-day site conditions from a plan alone. Do not seek alarm layouts, access-control secrets, security-system credentials, or other operational security details merely because a plan references them.${scope}${dates}`,
    'plan-review-comments': `Plan-review comments, correction cycles, review notes, deficiency lists, discipline reviews, applicant/designer responses, resubmittal records, approvals, and closure/status records for each review cycle. Preserve draft, comment, correction-required, response-submitted, accepted, unresolved, resolved, superseded, approved, and final states. A reviewer comment, correction request, or deficiency notation is a review-stage record and does not by itself establish an adjudicated code violation, final denial, misconduct, negligence, or legal liability.${scope}${dates}`,
    'correction-notices': `Correction notices, deficiency notices, stop-work or compliance notices where part of the permit/project file, service records, amendments, withdrawals, responses, reinspection results, and resolution/status records. Preserve alleged deficiency, issued notice, attempted service, served, stayed, appealed/reviewed, corrected, superseded, withdrawn, resolved, and final states where recorded. Do not infer valid service, final enforceability, waiver, default, deadline consequences, unlawful work, or unresolved noncompliance from issuance or document date alone.${scope}${dates}`,
    'certificate-of-occupancy': `Certificates of occupancy, temporary certificates, conditional occupancy records, final approvals, revocations, amendments, restrictions, issuance records, and records sufficient to show the exact agency-recorded occupancy status for the identified project. Preserve temporary, conditional, partial, final, revoked, expired, amended, superseded, and other states. A certificate does not by itself establish current physical condition, ownership, every use right, absence of later violations, or continuing compliance beyond its documented scope and effective status.${scope}${dates}`,
    'permit-history': `Permit history, application history, status history, inspection history, project indexes, linked permit records, and structured records showing applications, issuance, revisions, inspections, expiration, revocation, finalization, closure, and other recorded events for the identified property/project. Treat index and status entries as agency-recorded search/status evidence; do not infer that a listed event occurred exactly as coded, that a missing entry proves no permit existed, or that a status code alone establishes legality, illegality, physical condition, ownership, or compliance.${scope}${dates}`,
    'correspondence-and-notes': `Correspondence, emails, attachments, case notes, referrals, internal routing, applicant communications, contractor/design-professional communications, and documented exchanges concerning the property or permit matter, to the extent maintained and lawfully disclosable. Preserve sender, recipient, date, attachment, draft/final, quoted-versus-authored, and source distinctions. Do not treat statements in correspondence or notes as adjudicated facts or controlling legal conclusions merely because they appear in an agency file.${scope}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${dates}`}${project}${limits}`
}

function validatePropertyPermit(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('property address') && !descriptions.includes('permit number') && !descriptions.includes('parcel/apn')) {
    issues.push({ field: 'identifiers', message: 'Provide a property address, parcel/APN, or permit number so the agency can identify the correct project or property.' })
  }
  if (!descriptions.includes('project description supplied for identification only:')) {
    issues.push({ field: 'projectDescription', message: 'Describe the project, construction, alteration, occupancy, land-use, or permit matter.' })
  }
  if (!request.jurisdiction?.trim()) {
    issues.push({ field: 'jurisdiction', message: 'Provide the state/local jurisdiction before applying permitting, inspection, plan-access, disclosure, fee, deadline, or review rules.' })
  }
  return issues
}

export function buildPropertyPermitRecordsRequest(input: Record<string, unknown>) {
  const address = text(input, 'address')
  const permitNumber = text(input, 'permitNumber')
  const subject = text(input, 'projectDescription')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const selected = categories(input)
  return {
    title: `Property & Permit Records — ${permitNumber ?? address ?? subject ?? 'Property'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose:
      text(input, 'purpose') ??
      'Identify, preserve, obtain, and compare permitting, application, inspection, plan, review, correction, occupancy, history, correspondence, and request-status records for the specified property or project while preserving exact source, version, and procedural status.',
    scope: JSON.stringify({
      workflow: 'property-permit-records',
      intakeVersion: '2.0.0',
      address,
      parcelNumber: text(input, 'parcelNumber'),
      permitNumber,
      owner: text(input, 'owner'),
      department: text(input, 'department'),
      jurisdiction: text(input, 'jurisdiction'),
      dateStart: start,
      dateEnd: end,
      projectDescription: subject,
      requesterAccessContext: text(input, 'requesterAccessContext'),
      preferredFormat: text(input, 'preferredFormat'),
      narrowingNotes: text(input, 'narrowingNotes'),
      exclusions: text(input, 'exclusions'),
      priorRequestDate: text(input, 'priorRequestDate'),
      agencyRequestNumber: text(input, 'agencyRequestNumber'),
      agencyResponseDate: text(input, 'agencyResponseDate'),
      releaseStatus: text(input, 'releaseStatus'),
    }),
    items: selected.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'department'),
      systemHint:
        category === 'inspection-records'
          ? 'inspection / permit management system'
          : category === 'approved-plans' || category === 'site-plans'
            ? 'plan review / document management system'
            : category === 'permit-history' || category === 'building-permits' || category === 'permit-applications'
              ? 'permit / project tracking system'
              : undefined,
      format:
        text(input, 'preferredFormat') ??
        (category === 'approved-plans' || category === 'site-plans'
          ? 'native digital files or original plan format where available and lawfully producible'
          : category === 'permit-history'
            ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
            : undefined),
    })),
  }
}

export const PROPERTY_PERMIT_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY',
  'REFERENCED_RECORD_NOT_PRODUCED',
  'PROPERTY_IDENTIFIER_MISMATCH',
  'PERMIT_IDENTIFIER_MISMATCH',
  'DATE_GAP',
  'DUPLICATE_RECORD',
  'MISSING_ATTACHMENT',
  'UNEXPLAINED_WITHHOLDING',
  'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION',
  'UNRESPONSIVE_ITEM',
] as const

export const propertyPermitRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'property-permit-records',
  name: 'Property & Permit Records Request',
  description:
    'Build a targeted property and permit records request covering permits, applications, inspections, approved plans, site plans, plan review, corrections, occupancy, history, and correspondence without turning permit-system status into unsupported legality or compliance conclusions.',
  searchIntent: 'property permit records request',
  seo: {
    title: 'Property Permit Records Request — Permits, Inspections & Plans',
    description: 'Build a targeted property permit records request using an address, parcel/APN, permit number, project, date range, plan/inspection scope, and production-review controls.',
    canonicalPath: '/workflows/property-permit-records',
  },
  intakeVersion: '2.0.0',
  intake: PROPERTY_PERMIT_INTAKE,
  capabilities: PROPERTY_PERMIT_CAPABILITIES,
  request: { categories: PROPERTY_PERMIT_RECORD_CATEGORIES, build: buildPropertyPermitRecordsRequest },
  validate: validatePropertyPermit,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      preservePermitApplicationIssuedActiveExpiredSuspendedRevokedWithdrawnFinaledAndSupersededStates: true,
      doNotTreatApplicationFeePaymentOrApplicationNumberAsPermitApproval: true,
      doNotTreatPermitIssuanceAsProofWorkOccurredOrIsFullyCompliantOrLawful: true,
      preserveInspectionRequestedScheduledAttemptedCompletedPassedFailedCorrectedAndFinalStates: true,
      distinguishInspectorObservationFromCodeInterpretationOrLegalConclusion: true,
      doNotInferConsentLawfulEntryWarrantAuthorityComplianceNegligenceOrLiabilityFromInspectionRecord: true,
      preservePlanVersionRevisionApprovalAndSupersessionProvenance: true,
      doNotInferConstructionMatchedApprovedPlanOrLaterChangesWereApproved: true,
      doNotAssumeSecuritySensitiveCopyrightedConfidentialOrRestrictedPlansArePublic: true,
      preservePlanReviewDraftCommentCorrectionResolvedSupersededApprovedAndFinalStates: true,
      doNotTreatReviewCommentOrCorrectionRequestAsFinalViolationDenialMisconductOrLiabilityFinding: true,
      preserveCorrectionNoticeServiceStayAppealCorrectionWithdrawalAndFinalStates: true,
      doNotInferValidServiceFinalityWaiverDefaultDeadlineOrUnlawfulWorkFromNoticeDateAlone: true,
      preserveTemporaryConditionalPartialFinalRevokedExpiredAndSupersededOccupancyStates: true,
      doNotTreatOccupancyCertificateAsProofOfCurrentConditionOwnershipEveryUseRightOrContinuingCompliance: true,
      treatPermitHistoryAndStatusCodesAsSearchEvidenceNotConclusivePhysicalOrLegalFacts: true,
      doNotInferPermitAbsenceOrIllegalityFromMissingIndexEntry: true,
      doNotInferLegalOwnershipFromApplicantOwnerOrProjectPartyFieldWithoutVerification: true,
      protectPrivateContactFinancialMedicalSecurityAndAuthenticationData: true,
      neverRequestPasswordsOtpsTokensPrivateKeysRecoveryCodesAccessControlSecretsOrSystemCredentials: true,
      neverInventPermitPlanInspectionOccupancyOwnershipComplianceOrRequestStatus: true,
      neverInventDeadlinesFeesExemptionsPrivilegesInspectionRightsAppealRightsDisclosureRightsOrAccessEntitlement: true,
      requireVerifiedAuthorityForJurisdictionSpecificPermitInspectionPlanAccessDeadlineFeeAndReviewConclusions: true,
      requireHumanReviewForConsequentialPlanSecurityInspectionComplianceOwnershipDeadlineAndLegalAmbiguity: true,
    },
  }],
  responseAnalysis: {
    findingTypes: PROPERTY_PERMIT_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PROPERTY_PERMIT_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as {
        requestedItems?: readonly { category: string; description: string }[]
        records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[]
        address?: string
        parcelNumber?: string
        permitNumber?: string
        dateStart?: string
        dateEnd?: string
        agency?: string
        jurisdiction?: string
        owner?: string
        releaseStatus?: string
      }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 16),
      }))
      const deterministic = analyzePropertyPermitProduction(requested, records)
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) throw new Error(`PROPERTY_PERMIT_LLM_QUORUM_NOT_MET:${providers.length}/2`)
      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const analyzed = await Promise.all(
        records.slice(0, 25).map(async (record) => ({
          id: record.id,
          classification: await classifyPropertyPermit(providers, record, policy),
          facts: await extractPropertyPermitFacts(providers, record, policy),
        })),
      )
      const contradictions: {
        leftId: string
        rightId: string
        result: Awaited<ReturnType<typeof assessPropertyPermitContradiction>>
      }[] = []
      for (let i = 0; i < Math.min(records.length, 8); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 8); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessPropertyPermitContradiction(providers, records[i], records[j], policy),
          })
        }
      }
      const ai = await runPropertyPermitStrategy({
        workflow: 'property-permit-records',
        evidentiaryRules: {
          applicationIsNotPermitApproval: true,
          permitIssuanceDoesNotProveWorkOrCompliance: true,
          inspectionObservationIsDistinctFromLegalConclusion: true,
          planApprovalIsVersionSpecific: true,
          correctionCommentIsNotFinalViolationOrDenial: true,
          occupancyStatusMustPreserveTemporaryConditionalAndFinalState: true,
          permitIndexEntryIsSearchEvidenceNotConclusiveLegalFact: true,
          ownerApplicantFieldDoesNotEstablishLegalOwnership: true,
        },
        request: source.requestedItems ?? [],
        property: { address: source.address, parcelNumber: source.parcelNumber, owner: source.owner },
        identifiers: { permitNumber: source.permitNumber },
        dateRange: { start: source.dateStart, end: source.dateEnd },
        jurisdiction: source.jurisdiction,
        requestStatus: source.releaseStatus,
        productionSummary: deterministic,
        records: records.slice(0, 25).map((record) => ({
          id: record.id,
          filename: record.filename,
          category: record.category,
          text: record.text ?? '',
        })),
        extractedFacts: analyzed.map((item) => ({
          id: item.id,
          classification: item.classification.value,
          facts: item.facts.value,
        })),
        contradictions: contradictions
          .filter((item) => item.result.value.contradictory)
          .map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value })),
      })
      return {
        ...deterministic,
        aiStrategy: ai.value,
        aiProvenance: {
          providers: ai.providers,
          confidence: ai.confidence,
          disagreements: ai.disagreements,
          warnings: ai.warnings,
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
