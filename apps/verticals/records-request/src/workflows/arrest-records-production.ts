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

export const ARREST_RECORD_CATEGORIES = [
  'arrest-incident-and-supplemental-reports',
  'booking-intake-and-custody-records',
  'probable-cause-and-arrest-basis-records',
  'charges-citations-and-referral-records',
  'booking-photographs-and-identification-records',
  'property-evidence-and-receipt-records',
  'cad-dispatch-and-transport-records',
  'release-bail-bond-and-disposition-records',
  'media-and-related-record-indexes',
  'retention-redaction-and-withholding-records',
] as const

export const ARREST_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const ARREST_RECORD_INTAKE = [
  { id: 'agency', label: 'Law-enforcement / booking agency', required: true, helpText: 'Police, sheriff, corrections, detention, or other agency responsible for the arrest or booking.' },
  { id: 'personName', label: 'Arrested person', helpText: 'Full name or other identifying information.' },
  { id: 'arrestNumber', label: 'Arrest / booking number', helpText: 'Booking, arrest, jail, custody, or inmate number when known.' },
  { id: 'incidentNumber', label: 'Incident / report / CAD number', helpText: 'Police incident, report, case, CAD, or call-for-service number when known.' },
  { id: 'arrestDate', label: 'Arrest date', required: true, helpText: 'Date of arrest or booking.' },
  { id: 'timeStart', label: 'Approximate arrest time', helpText: 'Approximate beginning of the arrest/booking window.' },
  { id: 'timeEnd', label: 'Approximate booking / release cutoff', helpText: 'End of the relevant arrest, booking, or initial custody window.' },
  { id: 'location', label: 'Arrest location', helpText: 'Address, roadway, business, residence, or other arrest location when known.' },
  { id: 'facility', label: 'Booking / detention facility', helpText: 'Jail, station, detention center, or booking facility when known.' },
  { id: 'subjectMatter', label: 'Arrest / incident description', required: true, helpText: 'Plain-English description of the arrest, alleged offense, or incident.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...ARREST_RECORD_CATEGORIES]
  const known = new Set(ARREST_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof ARREST_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...ARREST_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'personName') && `arrested person ${text(input, 'personName')}`,
    text(input, 'arrestNumber') && `arrest/booking number ${text(input, 'arrestNumber')}`,
    text(input, 'incidentNumber') && `incident/report/CAD number ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `arrest location ${text(input, 'location')}`,
    text(input, 'facility') && `booking/detention facility ${text(input, 'facility')}`,
  ].filter(Boolean)
  const date = text(input, 'arrestDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const window = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${date ? ` Arrest date: ${date}${window}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Arrest/incident description: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'arrest-incident-and-supplemental-reports': `Arrest reports, incident/offense reports, officer narratives, probable-cause narratives contained in reports, supplemental reports, corrections, field-contact records, and records sufficient to identify the arrest event and participating officers.${scope}`,
    'booking-intake-and-custody-records': `Booking and intake records, booking sheets, custody/intake logs, booking timestamps, classification/status fields that are lawfully disclosable, facility intake records, and records sufficient to establish the initial custody timeline while excluding protected medical or health information.${scope}`,
    'probable-cause-and-arrest-basis-records': `Probable-cause declarations, arrest declarations, warrant references, arrest-authority records, sworn statements filed or maintained concerning the legal basis for arrest, and records sufficient to identify whether the arrest was warrant-based or warrantless, to the extent maintained and disclosable.${scope}`,
    'charges-citations-and-referral-records': `Booking-charge records, arrest-charge codes, citations, notices to appear, prosecutor-referral or charging-transmittal records, charge amendments/corrections known to the arresting or booking agency, and records sufficient to correlate the arrest with referred charges.${scope}`,
    'booking-photographs-and-identification-records': `Booking photographs, mugshot records, identification photographs, fingerprint-card or biometric-record metadata, and records sufficient to identify the booking/identification transaction, only to the extent lawfully disclosable; do not request restricted biometric templates or authentication data.${scope}`,
    'property-evidence-and-receipt-records': `Arrestee property receipts, property inventories, seized-property/evidence receipts, item identifiers, transfer records, and records sufficient to distinguish personal property from investigative evidence and show documented disposition or transfer.${scope}`,
    'cad-dispatch-and-transport-records': `CAD, dispatch, call-for-service, unit-assignment, transport, arrival/departure timestamp, radio-event, disposition, and vehicle/unit records sufficient to reconstruct the documented arrest-to-booking timeline.${scope}`,
    'release-bail-bond-and-disposition-records': `Agency-maintained release records, release timestamps, bail/bond status records, citation/release records, transfer-to-another-custodian records, court-transfer records, and other initial custody-disposition records, to the extent maintained and disclosable.${scope}`,
    'media-and-related-record-indexes': `Indexes or lists of body-camera, dash-camera, surveillance, booking video, photographs, audio, digital evidence, attachments, reports, or other media/records referenced by the arrest or booking records, including file identifiers and metadata sufficient to locate responsive material.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, deletion/destruction records, redaction logs, withholding determinations, exemption records, sealing references, privilege logs where maintained, and records stating the basis for responsive arrest/booking material not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validateArrestRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('arrest date:')) issues.push({ field: 'arrestDate', message: 'Provide the arrest date.' })
  if (!corpus.includes('arrest/incident description:')) issues.push({ field: 'subjectMatter', message: 'Describe the arrest or incident in plain language.' })
  if (!corpus.includes('arrested person ') && !corpus.includes('arrest/booking number') && !corpus.includes('incident/report/cad number')) {
    issues.push({ field: 'identifiers', message: 'Provide a person name, arrest/booking number, or incident/report number.' })
  }
  return issues
}

export function buildArrestRecordsRequest(input: Record<string, unknown>) {
  const name = text(input, 'personName')
  const arrestNumber = text(input, 'arrestNumber')
  const incidentNumber = text(input, 'incidentNumber')
  const arrestDate = text(input, 'arrestDate')
  const categories = selectedCategories(input)
  return {
    title: `Arrest Records — ${arrestNumber ?? incidentNumber ?? name ?? arrestDate ?? 'Arrest'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare lawfully disclosable arrest, booking, probable-cause, charge, property, dispatch, custody-disposition, media-index, retention, and withholding records associated with the specified arrest.',
    scope: JSON.stringify({
      workflow: 'arrest-records',
      personName: name,
      arrestNumber,
      incidentNumber,
      arrestDate,
      timeStart: text(input, 'timeStart'),
      timeEnd: text(input, 'timeEnd'),
      location: text(input, 'location'),
      facility: text(input, 'facility'),
      subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: arrestDate,
      dateEnd: arrestDate,
      custodian: text(input, 'facility'),
      systemHint:
        category === 'booking-intake-and-custody-records' || category === 'release-bail-bond-and-disposition-records'
          ? 'booking / jail / custody management system'
          : category === 'cad-dispatch-and-transport-records'
            ? 'CAD / dispatch / transport system'
            : category === 'property-evidence-and-receipt-records'
              ? 'property / evidence management system'
              : category === 'media-and-related-record-indexes'
                ? 'records / digital evidence management system'
                : undefined,
      format:
        category === 'booking-intake-and-custody-records' ||
        category === 'cad-dispatch-and-transport-records' ||
        category === 'media-and-related-record-indexes'
          ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : undefined,
    })),
  }
}

export const ARREST_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_MEDIA', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionArrestRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'arrest-records',
  name: 'Arrest Records Request',
  description: 'Build an arrest-specific request for incident reports, booking/intake, probable-cause records, charges, booking identification records, property/evidence receipts, CAD/transport, release/disposition, media indexes, and withholding/retention evidence.',
  searchIntent: 'arrest records request',
  seo: {
    title: 'Arrest Records Request — Booking, Probable Cause & Custody Records',
    description: 'Request arrest reports, booking records, probable-cause materials, charges, property receipts, CAD/transport records, release records, media indexes, and withholding evidence for a specific arrest.',
    canonicalPath: '/workflows/arrest-records',
  },
  intakeVersion: '2.0.0',
  intake: ARREST_RECORD_INTAKE,
  capabilities: ARREST_RECORD_CAPABILITIES,
  request: { categories: ARREST_RECORD_CATEGORIES, build: buildArrestRecordsRequest },
  validate: validateArrestRecords,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      requestArrestSpecificRecords: true,
      requestBookingAndCustodyTimelineSeparately: true,
      requestProbableCauseAndArrestBasisSeparately: true,
      doNotRequestProtectedMedicalOrHealthInformation: true,
      doNotRequestRestrictedBiometricTemplatesOrAuthenticationData: true,
      requestDisclosableRecordsAndSegregablePortions: true,
      requestRetentionAndWithholdingRecords: true,
      preserveIdentifiersAndTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: ARREST_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('ARREST_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessPoliceContradiction(providers, records[i], records[j], policy),
          })
        }
      }
      const strategy = await recommendPoliceFollowUp(providers, {
        workflow: 'arrest-records',
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
          .map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value })),
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
