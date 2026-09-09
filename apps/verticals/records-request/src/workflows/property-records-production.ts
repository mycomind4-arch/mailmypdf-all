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

export const PROPERTY_RECORD_CATEGORIES = [
  'assessor-parcel-characteristics-and-use-codes',
  'ownership-transfer-and-conveyance-history',
  'recorded-instruments-deeds-releases-and-notices',
  'liens-encumbrances-judgments-and-recorded-claims',
  'parcel-maps-surveys-plats-and-legal-description-records',
  'valuation-assessment-exemption-and-appeal-records',
  'property-tax-billing-payment-delinquency-and-redemption-records',
  'document-parcel-owner-and-tax-cross-indexes',
  'source-system-history-corrections-and-data-provenance',
  'redaction-withholding-access-and-unavailable-record-status',
] as const

export const PROPERTY_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const PROPERTY_RECORD_INTAKE = [
  { id: 'agency', label: 'Primary property-records agency', required: true, helpText: 'County assessor, recorder, tax collector/treasurer, clerk, surveyor, or other lawful custodian.' },
  { id: 'custodianType', label: 'Likely custodian', helpText: 'Assessor, recorder, tax collector, surveyor, clerk, GIS/parcel unit, or records office.' },
  { id: 'address', label: 'Property address', helpText: 'Street address or site identifier.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Assessor parcel number, APN, property ID, or tax parcel identifier.' },
  { id: 'owner', label: 'Owner / grantor / grantee', helpText: 'Current or prior owner, grantor, grantee, or taxpayer name when relevant.' },
  { id: 'documentNumber', label: 'Document / instrument number', helpText: 'Recording, instrument, book/page, reel/image, or document number when known.' },
  { id: 'taxAccount', label: 'Tax account / bill number', helpText: 'Property-tax account, bill, roll, redemption, or related identifier when known.' },
  { id: 'legalDescription', label: 'Legal description / subdivision', helpText: 'Lot, block, tract, subdivision, legal description, or map reference when known.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the property-record period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the property-record period.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'County, city, state, or other jurisdiction.' },
  { id: 'subjectMatter', label: 'Property / research objective', required: true, helpText: 'Plain-English description of the property issue or records objective.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...PROPERTY_RECORD_CATEGORIES]
  const known = new Set(PROPERTY_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof PROPERTY_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...PROPERTY_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'address') && `property address ${text(input, 'address')}`,
    text(input, 'parcelNumber') && `parcel/APN ${text(input, 'parcelNumber')}`,
    text(input, 'owner') && `owner/grantor/grantee ${text(input, 'owner')}`,
    text(input, 'documentNumber') && `document/instrument number ${text(input, 'documentNumber')}`,
    text(input, 'taxAccount') && `tax account/bill number ${text(input, 'taxAccount')}`,
    text(input, 'legalDescription') && `legal description/map reference ${text(input, 'legalDescription')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Property/research objective: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'assessor-parcel-characteristics-and-use-codes': `Assessor parcel records, parcel master data, situs address history, property characteristics, land/building characteristics, use/classification codes, assessment identifiers, and publicly accessible assessor notes or source fields sufficient to identify the parcel and how it is classified.${scope}`,
    'ownership-transfer-and-conveyance-history': `Publicly accessible ownership history and transfer/conveyance records sufficient to identify current and prior ownership, transfer dates, grantor/grantee relationships, and source instrument references. Do not infer legal title beyond the records produced.${scope}`,
    'recorded-instruments-deeds-releases-and-notices': `Recorded deeds, conveyances, releases, reconveyances, easements, covenants, notices, declarations, assignments, satisfactions, and other publicly accessible instruments indexed to the identified parcel, parties, or document numbers.${scope}`,
    'liens-encumbrances-judgments-and-recorded-claims': `Publicly accessible recorded liens, releases, judgments, assessments, notices of default, tax liens, mechanic's liens, encumbrance-related instruments, and records sufficient to identify recorded claims affecting the parcel or named parties. Request status from the record; do not infer present enforceability.${scope}`,
    'parcel-maps-surveys-plats-and-legal-description-records': `Parcel maps, subdivision maps, plats, recorded surveys, certificates of correction, lot-line or boundary map records, map-book references, legal-description records, and GIS/parcel geometry exports where maintained and lawfully available.${scope}`,
    'valuation-assessment-exemption-and-appeal-records': `Publicly accessible assessed values, valuation history, assessment roll entries, exemption/classification status, assessment notices, appeal/application indexes, decisions, and records sufficient to explain material valuation changes. Do not request confidential taxpayer financial submissions unless lawfully accessible.${scope}`,
    'property-tax-billing-payment-delinquency-and-redemption-records': `Publicly accessible property-tax roll, billing, payment-status, delinquency, penalty, tax-sale/redemption-status, installment, and related account history for the identified parcel or tax account, excluding protected payment credentials or financial-account information.${scope}`,
    'document-parcel-owner-and-tax-cross-indexes': `Publicly accessible indexes and cross-reference records connecting parcel/APN, recorded-document numbers, owner/grantor/grantee names, map references, tax accounts, assessor records, and related source records so the production can be reconciled across custodians.${scope}`,
    'source-system-history-corrections-and-data-provenance': `Publicly accessible change history, correction records, parcel renumbering or split/merge history, source-system field history, record-source references, import/update metadata, and records sufficient to explain material changes or discrepancies among assessor, recorder, tax, map, or parcel data.${scope}`,
    'redaction-withholding-access-and-unavailable-record-status': `Records or response details identifying redactions, withheld categories, unavailable records, non-retained records, custodian transfers/referrals, access restrictions, and the stated basis for withholding or nonproduction. Request segregable public portions where available.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validatePropertyRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  const hasIdentifier = corpus.includes('property address') || corpus.includes('parcel/apn') || corpus.includes('document/instrument number') || corpus.includes('tax account/bill number') || corpus.includes('legal description/map reference')
  if (!hasIdentifier) issues.push({ field: 'identifiers', message: 'Provide an address, parcel/APN, document number, tax account, or legal-description/map reference.' })
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the property-record period.' })
  if (!corpus.includes('property/research objective:')) issues.push({ field: 'subjectMatter', message: 'Describe the property or research objective.' })
  return issues
}

export function buildPropertyRecordsRequest(input: Record<string, unknown>) {
  const address = text(input, 'address')
  const parcelNumber = text(input, 'parcelNumber')
  const documentNumber = text(input, 'documentNumber')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Property & Parcel Records — ${parcelNumber ?? address ?? documentNumber ?? 'Property'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, obtain, and reconcile assessor, recorder, ownership, conveyance, lien, mapping/survey, valuation, tax, cross-index, and source-provenance records for the identified property.',
    scope: JSON.stringify({
      workflow: 'property-records', address, parcelNumber, owner: text(input, 'owner'), documentNumber,
      taxAccount: text(input, 'taxAccount'), legalDescription: text(input, 'legalDescription'),
      custodianType: text(input, 'custodianType'), dateStart: start, dateEnd: end,
      jurisdiction: text(input, 'jurisdiction'), subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'custodianType'),
      systemHint: category === 'assessor-parcel-characteristics-and-use-codes' || category === 'valuation-assessment-exemption-and-appeal-records'
        ? 'assessor / assessment roll system'
        : category === 'recorded-instruments-deeds-releases-and-notices' || category === 'liens-encumbrances-judgments-and-recorded-claims'
          ? 'recorder / document index system'
          : category === 'property-tax-billing-payment-delinquency-and-redemption-records'
            ? 'property tax / treasury system'
            : category === 'parcel-maps-surveys-plats-and-legal-description-records'
              ? 'GIS / survey / parcel mapping system'
              : undefined,
      format: category === 'document-parcel-owner-and-tax-cross-indexes' || category === 'source-system-history-corrections-and-data-provenance'
        ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained and lawfully available'
        : category === 'parcel-maps-surveys-plats-and-legal-description-records'
          ? 'native digital map/GIS/survey files or highest-quality electronic format where available'
          : undefined,
    })),
  }
}

export const PROPERTY_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH', 'DATE_GAP',
  'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionPropertyRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'property-records',
  name: 'Property & Parcel Records Request',
  description: 'Build a property-specific request for assessor, recorder, ownership/conveyance, lien, map/survey, valuation, tax, cross-index, and source-provenance records.',
  searchIntent: 'request property records',
  seo: {
    title: 'Property Records Request — Parcel, Deeds, Ownership, Liens, Maps & Taxes',
    description: 'Request assessor and parcel records, recorded deeds and liens, ownership history, maps and surveys, valuation records, tax history, and source-system records for a property.',
    canonicalPath: '/workflows/property-records',
  },
  intakeVersion: '2.0.0',
  intake: PROPERTY_RECORD_INTAKE,
  capabilities: PROPERTY_RECORD_CAPABILITIES,
  request: { categories: PROPERTY_RECORD_CATEGORIES, build: buildPropertyRecordsRequest },
  validate: validatePropertyRecords,
  policies: [{
    jurisdiction: 'all', version: '2.0.0', rules: {
      separateAssessorRecorderTaxMapAndPermitCustodians: true,
      doNotInferLegalTitleLienValidityOrTaxStatusBeyondProducedRecords: true,
      doNotRequestProtectedTaxpayerFinancialSubmissionsOrPaymentCredentials: true,
      requestStructuredIndexesAndSourceProvenanceWhereMaintained: true,
      requestSegregablePublicPortionsAndWithholdingBasis: true,
      routeDetailedPermitInspectionPlanReviewRecordsToPropertyPermitWorkflow: true,
      preserveParcelDocumentTaxAndMapIdentifiers: true,
      compareCrossCustodianIdentifiersBeforeTreatingProductionAsComplete: true,
    },
  }],
  responseAnalysis: {
    findingTypes: PROPERTY_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PROPERTY_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly GenericProductionRecord[] }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzeGenericProduction(requested, records, 'property record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'property-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'property-records', policy),
      })))
      const contradictions: Array<{ leftId: string; rightId: string; result: Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'property-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'property-records', {
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
