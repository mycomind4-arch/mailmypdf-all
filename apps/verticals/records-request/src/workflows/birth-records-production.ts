import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzeGenericProduction, type GenericProductionRecord } from './generic-records-analysis'
import {
  assessGenericRecordContradiction,
  classifyGenericRecord,
  extractGenericRecordFacts,
  recommendGenericRecordFollowUp,
} from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const BIRTH_RECORD_CATEGORIES = [
  'certificate-copy-type-and-availability',
  'registration-index-and-search-result-records',
  'eligibility-relationship-and-authorization-requirements',
  'application-order-and-submission-requirements',
  'identity-verification-notarization-and-supporting-document-requirements',
  'amendment-correction-supplement-and-status-records',
  'fees-processing-delivery-and-order-status-records',
  'agency-custodian-referral-and-jurisdiction-records',
  'denial-restriction-no-record-found-and-review-status',
] as const

export const BIRTH_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const BIRTH_RECORD_INTAKE = [
  { id: 'agency', label: 'Vital records office', required: true, helpText: 'State, county, city, territorial, or other vital-records office believed to hold the record.' },
  { id: 'jurisdiction', label: 'Jurisdiction', required: true, helpText: 'State, county, territory, or other jurisdiction where the birth was registered.' },
  { id: 'recordName', label: 'Name on the birth record', required: true, helpText: 'Name as it appears, or likely appears, on the record.' },
  { id: 'birthYear', label: 'Birth year', required: true, helpText: 'Year of birth. Use the most precise date only when the issuing office requires it.' },
  { id: 'birthPlace', label: 'Birth place', helpText: 'City, county, hospital, or other place of birth when known.' },
  { id: 'requesterCapacity', label: 'Requester capacity', required: true, helpText: 'For example: person named on the record, parent, legal representative, authorized agent, genealogical requester, or other lawful requester category.' },
  { id: 'relationship', label: 'Relationship / authority', helpText: 'Relationship to the person named on the record or the legal authority supporting access, if required.' },
  { id: 'copyType', label: 'Desired copy type', helpText: 'Certified, informational, genealogical, verification, abstract, or other copy type where the jurisdiction offers it.' },
  { id: 'existingOrderNumber', label: 'Existing order / application number', helpText: 'Order, application, tracking, or correspondence number if this is a follow-up.' },
  { id: 'dateStart', label: 'Request / search period start', required: true, helpText: 'Beginning of the relevant request, search, or order period.' },
  { id: 'dateEnd', label: 'Request / search period end', required: true, helpText: 'End of the relevant request, search, or order period.' },
  { id: 'subjectMatter', label: 'Objective', required: true, helpText: 'Plain-English description of the record, copy, correction, verification, or order-status objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...BIRTH_RECORD_CATEGORIES]
  const known = new Set(BIRTH_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof BIRTH_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...BIRTH_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'recordName') && `record name ${text(input, 'recordName')}`,
    text(input, 'birthYear') && `birth year ${text(input, 'birthYear')}`,
    text(input, 'birthPlace') && `birth place ${text(input, 'birthPlace')}`,
    text(input, 'existingOrderNumber') && `order/application number ${text(input, 'existingOrderNumber')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Identify the matter using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover request/search activity from ${start} through ${end}.` : ''}`
}

function accessText(input: Record<string, unknown>): string {
  const capacity = text(input, 'requesterCapacity')
  const relationship = text(input, 'relationship')
  const copyType = text(input, 'copyType')
  return `${capacity ? ` Requester capacity: ${capacity}.` : ''}${relationship ? ` Relationship/authority: ${relationship}.` : ''}${copyType ? ` Desired copy type: ${copyType}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const access = accessText(input)
  const objective = text(input, 'subjectMatter') ? ` Objective: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'certificate-copy-type-and-availability': `Records or written information sufficient to identify which birth-record products or copy types are available for this requester and record, including certified, informational, abstract, verification, genealogical, or other jurisdiction-specific options where offered. Do not assume any copy type is publicly available.${scope}${access}`,
    'registration-index-and-search-result-records': `Lawfully accessible registration, index, search-result, verification, or no-record-found information sufficient to identify whether the office located the requested birth record and which record identifiers may lawfully be disclosed. Do not request restricted underlying registration content unless the requester is eligible to receive it.${scope}${access}`,
    'eligibility-relationship-and-authorization-requirements': `Current written eligibility rules, requester categories, relationship or legal-authority requirements, authorization requirements, and records sufficient to explain what this requester must establish to lawfully receive the requested copy type. Request requirements, not a bypass of them.${scope}${access}`,
    'application-order-and-submission-requirements': `Current application or order forms, required fields, submission instructions, accepted delivery channels, signature requirements, and records sufficient to identify how a lawful request for the selected birth-record product must be submitted.${scope}${access}`,
    'identity-verification-notarization-and-supporting-document-requirements': `Current written requirements for identity verification, notarization, sworn statements, authorization documents, court orders, relationship proof, or other supporting documentation required for the requester category. Request only the requirements and status; do not request authentication secrets or another person's protected identity documents.${scope}${access}`,
    'amendment-correction-supplement-and-status-records': `Lawfully accessible amendment, correction, supplementation, delayed-registration, or change-status records and written procedures sufficient to identify whether an amendment/correction exists, what process applies, and the current status of a submitted correction matter. Do not request restricted amendment contents beyond the requester's lawful access.${scope}${access}`,
    'fees-processing-delivery-and-order-status-records': `Current fee schedule, accepted payment methods at a policy level, processing-time guidance, delivery options, expedite options if offered, and lawfully accessible status/history for the identified order or application. Do not request payment-card, bank-account, or authentication credentials.${scope}${access}`,
    'agency-custodian-referral-and-jurisdiction-records': `Records or written information sufficient to identify the correct issuing office, custodian, jurisdiction, referral destination, archive, or alternate office if the current office does not maintain or issue the requested birth record.${scope}${access}`,
    'denial-restriction-no-record-found-and-review-status': `Written denial, restriction, no-record-found, insufficient-identification, insufficient-eligibility, incomplete-application, or other nonproduction status; the stated reason; available cure or review procedure; and any segregable status information the requester may lawfully receive. Do not attempt to circumvent an eligibility or access restriction.${scope}${access}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${access}`}${objective}`
}

function validateBirthRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('record name ')) issues.push({ field: 'recordName', message: 'Provide the name on the birth record.' })
  if (!corpus.includes('birth year ')) issues.push({ field: 'birthYear', message: 'Provide the birth year.' })
  if (!corpus.includes('requester capacity:')) issues.push({ field: 'requesterCapacity', message: 'State the requester capacity so eligibility can be evaluated.' })
  if (!corpus.includes('cover request/search activity')) issues.push({ field: 'dateRange', message: 'Provide the relevant request or search period.' })
  if (!corpus.includes('objective:')) issues.push({ field: 'subjectMatter', message: 'Describe the birth-record objective.' })
  return issues
}

export function buildBirthRecordsRequest(input: Record<string, unknown>) {
  const recordName = text(input, 'recordName')
  const birthYear = text(input, 'birthYear')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Birth Records — ${recordName ?? 'Record'}${birthYear ? ` (${birthYear})` : ''}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Determine lawful eligibility and obtain, verify, correct, or track the appropriate birth-record product or status for the identified record.',
    scope: JSON.stringify({
      workflow: 'birth-records', recordName, birthYear, birthPlace: text(input, 'birthPlace'),
      requesterCapacity: text(input, 'requesterCapacity'), relationship: text(input, 'relationship'),
      copyType: text(input, 'copyType'), existingOrderNumber: text(input, 'existingOrderNumber'),
      dateStart: start, dateEnd: end, jurisdiction: text(input, 'jurisdiction'),
      subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'agency'),
      systemHint: category === 'fees-processing-delivery-and-order-status-records' || category === 'application-order-and-submission-requirements'
        ? 'vital-records order / application system'
        : category === 'registration-index-and-search-result-records' || category === 'amendment-correction-supplement-and-status-records'
          ? 'vital-registration / index system'
          : undefined,
    })),
  }
}

export const BIRTH_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH', 'DATE_GAP',
  'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionBirthRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'birth-records',
  name: 'Birth Records Request',
  description: 'Determine eligibility and build a lawful birth-record request covering copy availability, search/index status, authorization requirements, application requirements, amendments, fees/status, referrals, and access restrictions.',
  searchIntent: 'birth records request',
  seo: {
    title: 'Birth Records Request — Certificates, Eligibility, Corrections & Order Status',
    description: 'Build a lawful birth-record request for certificate availability, eligibility requirements, application steps, corrections, search results, fees, order status, and access restrictions.',
    canonicalPath: '/workflows/birth-records',
  },
  intakeVersion: '2.0.0',
  intake: BIRTH_RECORD_INTAKE,
  capabilities: BIRTH_RECORD_CAPABILITIES,
  request: { categories: BIRTH_RECORD_CATEGORIES, build: buildBirthRecordsRequest },
  validate: validateBirthRecords,
  policies: [{
    jurisdiction: 'all', version: '2.0.0', rules: {
      determineJurisdictionSpecificEligibilityBeforeRequestingRestrictedContent: true,
      doNotAssumeBirthCertificatesOrRegistrationRecordsArePublic: true,
      doNotImpersonateOrBypassRelationshipAuthorizationIdentityOrCourtOrderRequirements: true,
      doNotRequestAuthenticationSecretsOrAnotherPersonsProtectedIdentityDocuments: true,
      requestOnlyLawfullyAccessibleRecordProductsStatusAndSegregableInformation: true,
      distinguishCertifiedInformationalGenealogicalVerificationAndOtherCopyTypesWhereOffered: true,
      preserveApplicationOrderAndRecordIdentifiers: true,
      requireHumanReviewBeforeSubmissionWhenEligibilityOrAuthorizationIsUnclear: true,
    },
  }],
  responseAnalysis: {
    findingTypes: BIRTH_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('BIRTH_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly GenericProductionRecord[] }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzeGenericProduction(requested, records, 'birth-record request record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'birth-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'birth-records', policy),
      })))
      const contradictions: Array<{ leftId: string; rightId: string; result: Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'birth-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'birth-records', {
        deterministic,
        requestedItems: source.requestedItems ?? [],
        records: records.slice(0, 20).map((record) => ({ id: record.id, filename: record.filename, category: record.category, text: record.text ?? '' })),
        extracted: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value })),
        contradictions: contradictions.filter((item) => item.result.value.contradictory).map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value })),
      }, policy)
      return {
        ...deterministic,
        aiStrategy: strategy.value,
        aiProvenance: { providers: strategy.providers, confidence: strategy.confidence, disagreements: strategy.disagreements, warnings: strategy.warnings },
        aiRecordAnalysis: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value, classificationProvenance: item.classification.providers, factProvenance: item.facts.providers })),
        aiContradictions: contradictions.filter((item) => item.result.value.contradictory).map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value, providers: item.result.providers })),
      }
    },
  },
})
