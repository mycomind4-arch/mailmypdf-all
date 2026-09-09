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

export const OFFICER_DISCIPLINE_RECORD_CATEGORIES = [
  'officer-identity-and-employment-status',
  'disciplinary-findings-and-final-outcomes',
  'sustained-misconduct-records',
  'certification-licensing-and-decertification-records',
  'separation-resignation-and-last-chance-records',
  'brady-giglio-and-credibility-disclosure-records',
  'policy-training-and-remedial-action-records',
  'appeal-grievance-and-review-records',
  'disciplinary-indexes-and-case-tracking',
  'retention-redaction-and-withholding-records',
] as const

export const OFFICER_DISCIPLINE_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const OFFICER_DISCIPLINE_INTAKE = [
  {
    id: 'agency',
    label: 'Law-enforcement agency',
    required: true,
    helpText: 'Current or former employing police department, sheriff, state police, campus police, or other agency.',
  },
  {
    id: 'officerName',
    label: 'Officer / employee name',
    required: true,
    helpText: 'Full name when known. Do not supply passwords, account credentials, access codes, or unrelated private identifiers.',
  },
  {
    id: 'badgeNumber',
    label: 'Badge / employee / certification number',
    helpText: 'Badge, employee, POST, certification, or other non-secret identifier when known.',
  },
  {
    id: 'dateStart',
    label: 'Beginning date',
    required: true,
    helpText: 'Beginning of the period to search.',
  },
  {
    id: 'dateEnd',
    label: 'Ending date',
    required: true,
    helpText: 'End of the period to search.',
  },
  {
    id: 'state',
    label: 'State / jurisdiction',
    required: true,
    helpText: 'State or jurisdiction relevant to disclosure, personnel, certification, and review rules.',
  },
  {
    id: 'incidentNumber',
    label: 'Related complaint / incident number',
    helpText: 'Optional IA, complaint, incident, arrest, civil, or case number connected to the matter.',
  },
  {
    id: 'conduct',
    label: 'Conduct or discipline topic',
    helpText: 'Optional allegation, sustained finding, discipline, certification issue, separation, appeal, or credibility topic. Describe the topic without assuming the outcome.',
  },
  {
    id: 'requesterAccessContext',
    label: 'Requester / access context',
    helpText: 'Optional context such as public requester, subject employee, authorized representative, litigant, journalist, or other status. Access rights must be verified separately.',
  },
  {
    id: 'preferredFormat',
    label: 'Preferred production format',
    helpText: 'Optional preference such as searchable PDF, native files, or structured export where maintained and lawfully producible.',
  },
  {
    id: 'narrowingNotes',
    label: 'Narrowing instructions',
    helpText: 'Optional terms that narrow the search to identified matters, completed proceedings, date ranges, or specific record classes.',
  },
  {
    id: 'exclusions',
    label: 'Exclusions / privacy limits',
    helpText: 'Optional exclusions such as unrelated personnel files, home/contact data, medical information, victim/witness details, credentials, or unrelated investigations.',
  },
  {
    id: 'priorRequestDate',
    label: 'Prior request date',
    helpText: 'Optional date of an earlier records request.',
  },
  {
    id: 'agencyRequestNumber',
    label: 'Agency request / tracking number',
    helpText: 'Optional public-records request or agency tracking number.',
  },
  {
    id: 'agencyResponseDate',
    label: 'Agency response date',
    helpText: 'Optional date of the latest agency response or production.',
  },
  {
    id: 'releaseStatus',
    label: 'Known request / release status',
    helpText: 'Optional exact status stated by the agency, such as pending, partial production, completed, denied, withheld, or no records located. Preserve the agency wording.',
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
  if (!Array.isArray(raw)) return [...OFFICER_DISCIPLINE_RECORD_CATEGORIES]
  const known = new Set(OFFICER_DISCIPLINE_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string =>
      typeof entry === 'string' && known.has(entry as typeof OFFICER_DISCIPLINE_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...OFFICER_DISCIPLINE_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const officer = text(input, 'officerName')
  const badge = text(input, 'badgeNumber')
  const incident = text(input, 'incidentNumber')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const identifiers = [
    officer && `officer/employee ${officer}`,
    badge && `badge/employee/certification identifier ${badge}`,
    incident && `related complaint/incident number ${incident}`,
  ].filter(Boolean)
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function requestLimits(input: Record<string, unknown>): string {
  const narrowing = text(input, 'narrowingNotes')
  const exclusions = text(input, 'exclusions')
  const pieces = [
    narrowing && ` Narrowing instructions: ${narrowing}.`,
    exclusions && ` Exclude or segregate unrelated/sensitive material as follows: ${exclusions}.`,
  ].filter(Boolean)
  return pieces.join('')
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const limits = requestLimits(input)
  const topic = text(input, 'conduct') ? ` Conduct/discipline topic supplied for search only: ${text(input, 'conduct')}.` : ''
  const descriptions: Record<string, string> = {
    'officer-identity-and-employment-status': `Records sufficient to identify the officer or employee, employing agency, badge/employee identifiers, assignments or ranks relevant to the search period, dates of employment, and expressly stated current or final employment status, to the extent maintained and lawfully disclosable. Do not infer discipline, certification status, or the reason for separation from employment status alone.${scope}`,
    'disciplinary-findings-and-final-outcomes': `Final or currently operative disciplinary findings, final notices of discipline, disposition records, final orders, settlement or resolution records, and records sufficient to show the exact outcome and effective status of completed disciplinary matters, to the extent maintained and lawfully disclosable. Preserve whether an outcome was affirmed, modified, reversed, vacated, remanded, superseded, settled, withdrawn, or remains under review rather than upgrading a preliminary action into a final finding.${scope}`,
    'sustained-misconduct-records': `Records expressly documenting sustained misconduct findings or final factual findings in completed matters involving the identified officer or employee, including the agency's exact finding terminology, category of misconduct, effective disposition, and any later modification or reversal, to the extent maintained and lawfully disclosable. Do not convert allegations, complaints, referrals, pending investigations, training assignments, or preliminary recommendations into sustained findings.${scope}`,
    'certification-licensing-and-decertification-records': `Peace-officer certification, licensing, POST-status, suspension, revocation, surrender, decertification, reinstatement, reporting, and related state-certification records associated with the identified officer, including effective dates and exact status where maintained and lawfully disclosable. Do not infer certification, decertification, suspension, or reinstatement from employment or discipline records alone.${scope}`,
    'separation-resignation-and-last-chance-records': `Records sufficient to show resignation, retirement, termination, separation, expressly documented resignation in lieu of discipline, last-chance agreements, final separation status, or comparable completed employment outcomes connected to disciplinary or certification proceedings, to the extent maintained and lawfully disclosable. Do not label a resignation or retirement as discipline-related unless the responsive record expressly supports that characterization.${scope}`,
    'brady-giglio-and-credibility-disclosure-records': `Records sufficient to identify any expressly documented Brady, Giglio, credibility, impeachment, prosecutor-notification, disclosure-list, or comparable determination concerning the identified officer where such records are maintained and lawfully disclosable; if specific records are withheld, provide segregable portions and the stated basis for withholding. Do not infer list inclusion, a credibility determination, dishonesty, or prosecutorial action from a complaint, discipline record, allegation, or training referral alone.${scope}`,
    'policy-training-and-remedial-action-records': `Policies, directives, training standards, remedial training, corrective-action records, and policy provisions identified, cited, applied, or relied on in a completed disciplinary or certification matter involving the identified officer, to the extent maintained and lawfully disclosable. Preserve whether training or corrective action was mandatory, recommended, preventive, remedial, or unrelated to a disciplinary finding; do not treat training by itself as proof of misconduct or discipline.${scope}`,
    'appeal-grievance-and-review-records': `Appeal, grievance, arbitration, civil-service, administrative-review, command-review, settlement, remand, reconsideration, or comparable records showing whether discipline or findings were affirmed, modified, reversed, vacated, settled, remanded, superseded, withdrawn, or remain pending, to the extent maintained and lawfully disclosable. Preserve the latest verified operative status and do not present an earlier discipline decision as final when a later review changed it.${scope}`,
    'disciplinary-indexes-and-case-tracking': `Disciplinary case indexes, complaint/IA case numbers, tracking logs, disposition codes, certification-reporting logs, matter lists, status history, and other structured records sufficient to identify responsive matters and their recorded status. Treat index or tracking entries as search/status evidence only, not as proof that an allegation was sustained or discipline imposed.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, destruction/deletion records, redaction logs, withholding determinations, exemption records, privilege logs where maintained, release/production logs, and records stating the basis for responsive material not produced. Do not infer spoliation, unlawful withholding, privilege waiver, misconduct, or a legal violation solely from retention, deletion, redaction, or withholding metadata.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${topic}${limits}`
}

function validateOfficerDiscipline(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('officer/employee ')) {
    issues.push({ field: 'officerName', message: 'Provide the officer or employee name.' })
  }
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the records search.' })
  }
  if (!request.jurisdiction?.trim()) {
    issues.push({ field: 'state', message: 'Provide the state or jurisdiction before applying disclosure or certification rules.' })
  }
  return issues
}

export function buildOfficerDisciplineRecordsRequest(input: Record<string, unknown>) {
  const officerName = text(input, 'officerName')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const jurisdiction = text(input, 'state') ?? text(input, 'jurisdiction')
  const categories = selectedCategories(input)

  return {
    title: `Officer Discipline Records — ${officerName ?? 'Officer'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction,
    purpose:
      text(input, 'purpose') ??
      'Identify, preserve, obtain, and compare lawfully disclosable records concerning verified officer disciplinary outcomes, sustained findings, certification status, separation, credibility disclosures, appeals/review, request/release status, and withholding while preserving exact evidentiary status.',
    scope: JSON.stringify({
      workflow: 'officer-discipline-records',
      intakeVersion: '2.0.0',
      officerName,
      badgeNumber: text(input, 'badgeNumber'),
      dateStart: start,
      dateEnd: end,
      state: jurisdiction,
      incidentNumber: text(input, 'incidentNumber'),
      conduct: text(input, 'conduct'),
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
      systemHint:
        category === 'disciplinary-indexes-and-case-tracking' || category === 'disciplinary-findings-and-final-outcomes'
          ? 'internal affairs / professional standards / personnel case-management system'
          : category === 'certification-licensing-and-decertification-records'
            ? 'state peace-officer standards / certification system'
            : undefined,
      format:
        text(input, 'preferredFormat') ??
        (category === 'disciplinary-indexes-and-case-tracking'
          ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : undefined),
    })),
  }
}

export const OFFICER_DISCIPLINE_FINDINGS = [
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

export const officerDisciplineRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'officer-discipline-records',
  name: 'Officer Discipline & Certification Records Request',
  description:
    'Build a jurisdiction-sensitive request for final disciplinary outcomes, sustained misconduct, officer certification or decertification status, separation records, credibility disclosures, review records, structured indexes, and withholding evidence while preserving exact final-status provenance.',
  searchIntent: 'police officer disciplinary records request',
  seo: {
    title: 'Police Officer Disciplinary Records Request — Discipline & Certification',
    description:
      'Request lawfully disclosable police disciplinary outcomes, sustained misconduct records, certification or decertification records, separation outcomes, credibility disclosures, reviews, and withholding records.',
    canonicalPath: '/workflows/officer-discipline-records',
  },
  intakeVersion: '2.0.0',
  intake: OFFICER_DISCIPLINE_INTAKE,
  capabilities: OFFICER_DISCIPLINE_CAPABILITIES,
  request: {
    categories: OFFICER_DISCIPLINE_RECORD_CATEGORIES,
    build: buildOfficerDisciplineRecordsRequest,
  },
  validate: validateOfficerDiscipline,
  policies: [
    {
      jurisdiction: 'all',
      version: '2.0.0',
      rules: {
        doNotAssumePersonnelOrDisciplinaryRecordsArePublic: true,
        requestFinalOutcomesWhereLawfullyDisclosable: true,
        requestDisclosableRecordsAndSegregablePortions: true,
        preserveExactAgencyFindingAndDispositionLanguage: true,
        preservePreliminaryVersusFinalStatus: true,
        preserveAppealModificationReversalAndRemandStatus: true,
        doNotPromoteComplaintAllegationOrReferralToFinding: true,
        doNotTreatTrainingOrCorrectiveActionAsDisciplineByItself: true,
        doNotInferResignationInLieuOfDiscipline: true,
        doNotInferCertificationStatusFromEmploymentOrDiscipline: true,
        doNotAssumeBradyGiglioListsOrDeterminationsArePublic: true,
        doNotInferBradyGiglioStatusOrCredibilityFinding: true,
        requestCertificationRecordsSeparately: true,
        requestStructuredIndexesWhereMaintained: true,
        treatIndexesAsSearchEvidenceNotFindingProof: true,
        requestRetentionRedactionWithholdingAndReleaseEvidence: true,
        doNotInferSpoliationUnlawfulWithholdingOrPrivilegeWaiver: true,
        protectPersonnelMedicalVictimWitnessJuvenileAndConfidentialSourceData: true,
        protectHomeContactSsnFinancialAndAuthenticationData: true,
        neverRequestPasswordsOtpsTokensPrivateKeysOrSystemCredentials: true,
        neverInventCaseExistenceDisciplineFindingsCertificationOrSeparationStatus: true,
        neverInventDeadlinesExemptionsPrivilegesDisclosureRightsOrAccessEntitlement: true,
        requireVerifiedAuthorityForJurisdictionSpecificLegalConclusions: true,
        requireHumanReviewForConsequentialStatusPrivacyPrivilegeAndAccessAmbiguity: true,
      },
    },
  ],
  responseAnalysis: {
    findingTypes: OFFICER_DISCIPLINE_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') {
        throw new Error('OFFICER_DISCIPLINE_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
          workflow: 'officer-discipline-records',
          evidentiaryRules: {
            preserveExactStatus: true,
            allegationIsNotFinding: true,
            referralOrTrainingIsNotDiscipline: true,
            appealMayModifyFinalStatus: true,
            certificationIsIndependentOfEmploymentStatus: true,
            doNotInferBradyGiglioStatus: true,
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
