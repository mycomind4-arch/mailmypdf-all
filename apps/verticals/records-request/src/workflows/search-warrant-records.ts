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

export const SEARCH_WARRANT_RECORD_CATEGORIES = [
  'warrant-and-order',
  'application-affidavit-and-probable-cause-materials',
  'attachments-exhibits-and-incorporated-materials',
  'return-and-inventory',
  'execution-and-service-records',
  'evidence-property-and-seizure-records',
  'docket-index-and-case-tracking',
  'sealing-unsealing-and-access-orders',
  'related-reports-and-media-indexes',
  'retention-redaction-and-withholding-records',
] as const

export const SEARCH_WARRANT_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const SEARCH_WARRANT_INTAKE = [
  {
    id: 'agency',
    label: 'Agency or records custodian',
    required: true,
    helpText: 'Executing law-enforcement agency, court clerk, prosecutor, or other likely custodian.',
  },
  {
    id: 'jurisdiction',
    label: 'State / jurisdiction',
    required: true,
    helpText: 'State, federal district, tribe, territory, or other jurisdiction relevant to sealing, access, and disclosure rules.',
  },
  {
    id: 'issuingCourt',
    label: 'Issuing court / judicial authority',
    helpText: 'Court, division, magistrate, or other issuing authority when known.',
  },
  {
    id: 'warrantNumber',
    label: 'Warrant / application number',
    helpText: 'Warrant, application, miscellaneous, docket, or tracking number when known.',
  },
  {
    id: 'caseNumber',
    label: 'Related court / criminal case number',
    helpText: 'Related criminal, civil, miscellaneous, or court case number when known.',
  },
  {
    id: 'dateStart',
    label: 'Beginning date',
    required: true,
    helpText: 'Beginning of the relevant application/execution period.',
  },
  {
    id: 'dateEnd',
    label: 'Ending date',
    required: true,
    helpText: 'End of the relevant application/execution period.',
  },
  {
    id: 'location',
    label: 'Search location / property',
    helpText: 'Address, parcel, vehicle, device, account, or other searched place/property when known. Do not provide passwords, access codes, tokens, private keys, or unrelated private content.',
  },
  {
    id: 'subject',
    label: 'Person / account / device subject',
    helpText: 'Name or non-secret identifier associated with the warrant when appropriate.',
  },
  {
    id: 'executingAgency',
    label: 'Executing agency',
    helpText: 'Agency or task force that applied for or executed the warrant.',
  },
  {
    id: 'incidentNumber',
    label: 'Related incident / report number',
    helpText: 'Police report, CAD, investigation, evidence, or incident identifier.',
  },
  {
    id: 'requesterAccessContext',
    label: 'Requester / access context',
    helpText: 'Optional context such as public requester, case party, counsel, subject, journalist, or authorized representative. Access rights must be verified separately.',
  },
  {
    id: 'preferredFormat',
    label: 'Preferred production format',
    helpText: 'Optional preference such as searchable PDF, native file, structured docket export, or media index where maintained and lawfully producible.',
  },
  {
    id: 'narrowingNotes',
    label: 'Narrowing instructions',
    helpText: 'Optional limits such as specific warrant numbers, filing dates, execution dates, record classes, or unsealed portions.',
  },
  {
    id: 'exclusions',
    label: 'Exclusions / privacy limits',
    helpText: 'Optional exclusions such as unrelated private communications, medical data, victim/witness information, juvenile information, credentials, authentication secrets, or unrelated investigations.',
  },
  {
    id: 'priorRequestDate',
    label: 'Prior request date',
    helpText: 'Optional date of an earlier records request.',
  },
  {
    id: 'agencyRequestNumber',
    label: 'Agency request / tracking number',
    helpText: 'Optional records-request or agency tracking number.',
  },
  {
    id: 'agencyResponseDate',
    label: 'Agency response date',
    helpText: 'Optional date of the latest response or production.',
  },
  {
    id: 'releaseStatus',
    label: 'Known access / release status',
    helpText: 'Optional exact status stated by the court or agency, such as sealed, partially sealed, unsealed, pending review, partial production, withheld, or no records located. Preserve the stated wording.',
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
  if (!Array.isArray(raw)) return [...SEARCH_WARRANT_RECORD_CATEGORIES]
  const known = new Set(SEARCH_WARRANT_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string =>
      typeof entry === 'string' && known.has(entry as typeof SEARCH_WARRANT_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...SEARCH_WARRANT_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'warrantNumber') && `warrant/application number ${text(input, 'warrantNumber')}`,
    text(input, 'caseNumber') && `related case number ${text(input, 'caseNumber')}`,
    text(input, 'incidentNumber') && `incident/report number ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `search location/property ${text(input, 'location')}`,
    text(input, 'subject') && `subject ${text(input, 'subject')}`,
    text(input, 'issuingCourt') && `issuing court/authority ${text(input, 'issuingCourt')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${ids.length ? ` Search using: ${ids.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
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
  const descriptions: Record<string, string> = {
    'warrant-and-order': `The search warrant, signed warrant, judicial order, authorization, amendments, extensions, corrected warrants, and records sufficient to identify the issuing authority, issuance date, expressly authorized scope, and any return date or deadline stated in the record, to the extent unsealed and lawfully disclosable. Preserve whether a document is an application, unsigned draft, signed order, amended order, expired order, or other distinct status; do not infer validity, scope, or lawfulness beyond the document itself.${scope}`,
    'application-affidavit-and-probable-cause-materials': `Search-warrant application, affidavit, declaration, probable-cause statement, incorporated statement of facts, supplemental affidavit, and comparable supporting materials, to the extent unsealed and lawfully disclosable; request segregable portions where only part is restricted. Treat factual assertions, informant statements, allegations, and affiant conclusions as source-attributed assertions rather than adjudicated facts.${scope}`,
    'attachments-exhibits-and-incorporated-materials': `Attachments, exhibits, photographs, maps, lists, incorporated documents, descriptions of items to be seized or places/accounts/devices to be searched, and referenced supporting materials associated with the warrant application or order, to the extent unsealed and lawfully disclosable. Preserve which attachment is actually incorporated or signed rather than assuming every referenced document became part of the authorization.${scope}`,
    'return-and-inventory': `Executed warrant return, return of service, inventory, receipt, judicial return filing, property list, seizure list, and records sufficient to show the recorded return status and items expressly listed as seized or received. Do not infer that every item mentioned elsewhere was seized, retained, or returned unless supported by the responsive return, inventory, or property record.${scope}`,
    'execution-and-service-records': `Execution logs, service records, operational chronology, officer/unit assignments, entry/service time records, execution reports, after-action records, and records sufficient to identify when, where, and by whom the warrant was reportedly executed, to the extent maintained and lawfully disclosable. Preserve source attribution and do not convert an execution narrative into a legal conclusion that the search complied with or exceeded the warrant.${scope}`,
    'evidence-property-and-seizure-records': `Evidence/property receipts, seizure inventories, evidence tags, chain-of-custody or property-control records, transfer records, booking/property-system entries, and records sufficient to identify property or data expressly recorded as seized pursuant to the warrant. Request records and non-secret identifiers only; do not request passwords, passcodes, encryption keys, authentication tokens, private keys, recovery codes, evidence-system credentials, or unrelated private content.${scope}`,
    'docket-index-and-case-tracking': `Docket entries, register-of-actions entries, warrant/application indexes, case-tracking records, filing history, event codes, document lists, and structured metadata sufficient to identify filings, sealing status, return filings, and related proceedings. Treat docket or index entries as filing/status evidence only, not proof of the truth of affidavit assertions, the validity of the warrant, or the lawfulness of execution.${scope}`,
    'sealing-unsealing-and-access-orders': `Orders or docket records concerning sealing, partial sealing, unsealing, delayed disclosure, access restrictions, redactions, expiration of sealing, and records sufficient to identify the latest verified access status and stated basis for restriction. Do not circumvent a sealing order or infer that a record is public merely because a docket entry exists, a seal may have expired, or another related document was released.${scope}`,
    'related-reports-and-media-indexes': `Indexes or lists of police reports, investigative reports, photographs, body-camera or dash-camera media, digital evidence, forensic extractions, attachments, and other records referenced in or generated from execution of the warrant, to the extent maintained and lawfully disclosable. Request indexes and lawfully releasable records without seeking evidence-system credentials, hidden storage paths, authentication secrets, or unrelated private data.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, destruction/deletion records, redaction logs, withholding determinations, exemption records, sealing references, privilege logs where maintained, production/release logs, and records stating the basis for responsive material not produced. Do not infer spoliation, unlawful withholding, privilege waiver, misconduct, or a legal violation solely from retention, deletion, sealing, redaction, or withholding metadata.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${limits}`
}

function validateSearchWarrant(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the warrant search period.' })
  }
  if (
    !corpus.includes('warrant/application number') &&
    !corpus.includes('related case number') &&
    !corpus.includes('incident/report number') &&
    !corpus.includes('search location/property') &&
    !corpus.includes('subject ')
  ) {
    issues.push({ field: 'identifiers', message: 'Provide at least one warrant/case/incident number, search location, or subject identifier.' })
  }
  if (!request.jurisdiction?.trim()) {
    issues.push({ field: 'jurisdiction', message: 'Provide the jurisdiction before applying sealing, access, or disclosure rules.' })
  }
  return issues
}

export function buildSearchWarrantRecordsRequest(input: Record<string, unknown>) {
  const warrantNumber = text(input, 'warrantNumber')
  const caseNumber = text(input, 'caseNumber')
  const location = text(input, 'location')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)

  return {
    title: `Search Warrant Records — ${warrantNumber ?? caseNumber ?? location ?? 'Warrant'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose:
      text(input, 'purpose') ??
      'Identify, preserve, obtain, and compare unsealed or otherwise lawfully disclosable search-warrant papers, supporting materials, returns, inventories, execution records, evidence/property records, docket status, sealing/access records, and withholding/release evidence while preserving exact source and legal status.',
    scope: JSON.stringify({
      workflow: 'search-warrant-records',
      intakeVersion: '2.0.0',
      warrantNumber,
      caseNumber,
      dateStart: start,
      dateEnd: end,
      location,
      subject: text(input, 'subject'),
      executingAgency: text(input, 'executingAgency'),
      incidentNumber: text(input, 'incidentNumber'),
      jurisdiction: text(input, 'jurisdiction'),
      issuingCourt: text(input, 'issuingCourt'),
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
      custodian: text(input, 'executingAgency'),
      systemHint:
        category === 'docket-index-and-case-tracking' || category === 'sealing-unsealing-and-access-orders'
          ? 'court docket / warrant application tracking system'
          : category === 'evidence-property-and-seizure-records'
            ? 'evidence / property management system'
            : category === 'execution-and-service-records'
              ? 'records management / CAD / operational reporting system'
              : undefined,
      format:
        text(input, 'preferredFormat') ??
        (category === 'docket-index-and-case-tracking'
          ? 'native docket export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : undefined),
    })),
  }
}

export const SEARCH_WARRANT_FINDINGS = [
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

export const searchWarrantRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'search-warrant-records',
  name: 'Search Warrant Records Request',
  description:
    'Build a targeted request for search-warrant papers, application/affidavit materials, returns and inventories, execution records, evidence/property records, docket/index data, sealing status, related report/media indexes, and withholding/release evidence without collapsing allegations, filing status, or execution records into legal conclusions.',
  searchIntent: 'search warrant records request',
  seo: {
    title: 'Search Warrant Records Request — Warrant, Affidavit, Return & Inventory',
    description:
      'Request unsealed or lawfully disclosable search-warrant records, affidavits, supporting exhibits, returns, inventories, execution records, docket entries, sealing orders, and withholding records.',
    canonicalPath: '/workflows/search-warrant-records',
  },
  intakeVersion: '2.0.0',
  intake: SEARCH_WARRANT_INTAKE,
  capabilities: SEARCH_WARRANT_CAPABILITIES,
  request: {
    categories: SEARCH_WARRANT_RECORD_CATEGORIES,
    build: buildSearchWarrantRecordsRequest,
  },
  validate: validateSearchWarrant,
  policies: [
    {
      jurisdiction: 'all',
      version: '2.0.0',
      rules: {
        doNotAssumeWarrantAffidavitsOrAttachmentsArePublic: true,
        doNotCircumventSealingOrAccessOrders: true,
        requestUnsealedDisclosableRecordsAndSegregablePortions: true,
        preserveApplicationUnsignedSignedAmendedAndFinalOrderStatus: true,
        preserveSourceAttributionForAffidavitAssertions: true,
        doNotTreatAffidavitAllegationsAsAdjudicatedFacts: true,
        doNotInferProbableCauseSufficiencyOrWarrantValidity: true,
        doNotInferSearchLawfulnessOrScopeComplianceFromExecutionRecords: true,
        requestReturnAndInventorySeparately: true,
        doNotInferSeizureFromNarrativeWithoutReturnInventoryOrPropertyEvidence: true,
        requestCurrentSealingStatusAndBasis: true,
        doNotInferPublicAccessFromDocketPresenceOrRelatedRelease: true,
        requestStructuredDocketIndexesWhereMaintained: true,
        treatDocketAndIndexEntriesAsStatusEvidenceNotMeritsProof: true,
        requestRetentionRedactionWithholdingAndReleaseEvidence: true,
        doNotInferSpoliationUnlawfulWithholdingOrPrivilegeWaiver: true,
        protectVictimWitnessJuvenileMedicalConfidentialSourceAndPrivateContent: true,
        neverRequestPasswordsPasscodesTokensPrivateKeysRecoveryCodesOrSystemCredentials: true,
        neverInventWarrantExistenceIssuanceExecutionReturnSeizureOrSealingStatus: true,
        neverInventDeadlinesExemptionsPrivilegesDisclosureRightsOrAccessEntitlement: true,
        requireVerifiedAuthorityForJurisdictionSpecificLegalConclusions: true,
        requireHumanReviewForConsequentialSealingAccessPrivacyPrivilegeAndLegalityAmbiguity: true,
      },
    },
  ],
  responseAnalysis: {
    findingTypes: SEARCH_WARRANT_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') {
        throw new Error('SEARCH_WARRANT_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
          workflow: 'search-warrant-records',
          evidentiaryRules: {
            affidavitAssertionIsNotAdjudicatedFact: true,
            docketEntryIsStatusEvidenceOnly: true,
            sealingStatusRequiresVerifiedRecord: true,
            executionRecordDoesNotEstablishLawfulness: true,
            seizureRequiresReturnInventoryOrPropertyEvidence: true,
            doNotInferWarrantValidityOrProbableCauseSufficiency: true,
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
