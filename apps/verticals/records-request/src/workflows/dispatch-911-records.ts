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

export const DISPATCH_911_RECORD_CATEGORIES = [
  '911-call-audio',
  '911-call-logs',
  'cad-event-history',
  'dispatch-radio-audio',
  'radio-and-dispatch-logs',
  'unit-assignments-and-status',
  'event-timestamps-and-disposition',
  'incident-and-supplemental-reports',
  'retention-and-deletion-records',
  'redaction-and-withholding-records',
] as const

export const DISPATCH_911_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence',
  'research', 'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review',
  'approval', 'mailing', 'tracking', 'proofAudit',
]

export const DISPATCH_911_INTAKE = [
  { id: 'agency', label: 'Agency / dispatch center', required: true, helpText: 'Police, sheriff, fire/EMS communications center, PSAP, consolidated dispatch, or other likely custodian.' },
  { id: 'department', label: 'Likely records / communications unit', helpText: 'Dispatch, communications, records, emergency communications, or another likely custodian.' },
  { id: 'incidentDate', label: 'Incident date', required: true, helpText: 'Date of the call or dispatched event.' },
  { id: 'timeStart', label: 'Approximate start time', helpText: 'Beginning of the call/event window when known.' },
  { id: 'timeEnd', label: 'Approximate end time', helpText: 'End of the call/event window when known.' },
  { id: 'incidentNumber', label: 'Incident / CAD / event number', helpText: 'CAD, call-for-service, incident, report, or event number when known.' },
  { id: 'location', label: 'Incident location', required: true, helpText: 'Address, intersection, business, parcel, or other location associated with the event.' },
  { id: 'callerPhone', label: 'Caller phone number', helpText: 'Optional number associated with the call, if known and appropriate to provide.' },
  { id: 'person', label: 'Person involved', helpText: 'Caller, subject, victim, witness, or another person that can help identify the event.' },
  { id: 'subjectMatter', label: 'What happened', required: true, helpText: 'Plain-English description of the call, response, or incident.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...DISPATCH_911_RECORD_CATEGORIES]
  const known = new Set(DISPATCH_911_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof DISPATCH_911_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...DISPATCH_911_RECORD_CATEGORIES]
}

function identifyingScope(input: Record<string, unknown>): string {
  const values = [
    text(input, 'incidentNumber') && `incident/CAD/event number ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `location ${text(input, 'location')}`,
    text(input, 'callerPhone') && `caller number ${text(input, 'callerPhone')}`,
    text(input, 'person') && `person ${text(input, 'person')}`,
  ].filter(Boolean)
  const date = text(input, 'incidentDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const time = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  return `${values.length ? ` Search using: ${values.join('; ')}.` : ''}${date ? ` Event date: ${date}${time}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = identifyingScope(input)
  const subject = text(input, 'subjectMatter') ? ` Event description: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    '911-call-audio': `Audio recordings of 911, emergency, non-emergency, transferred, or related calls associated with the identified event, including separate call segments where maintained.${scope}`,
    '911-call-logs': `Call-detail records, call-taker logs, queue/transfer history, call identifiers, timestamps, disposition fields, and associated call metadata for the identified event.${scope}`,
    'cad-event-history': `Complete CAD or call-for-service event history, including event creation, comments/narrative, updates, priority changes, unit activity, timestamps, disposition, and event identifiers.${scope}`,
    'dispatch-radio-audio': `Recorded dispatch and radio traffic associated with the identified event, including relevant dispatch, tactical, primary, or mutual-aid channels where maintained.${scope}`,
    'radio-and-dispatch-logs': `Radio logs, dispatch logs, console event records, channel/talkgroup identifiers, transmission indexes, and related communications metadata associated with the event.${scope}`,
    'unit-assignments-and-status': `Records identifying responding units and personnel, assignment times, en-route/arrival/clear times, unit-status changes, and related response history.${scope}`,
    'event-timestamps-and-disposition': `Timestamp and disposition records showing call receipt, dispatch, acknowledgment, arrival, clearing, closure, cancellation, transfer, or other material event-state changes.${scope}`,
    'incident-and-supplemental-reports': `Incident, offense, arrest, supplemental, field-contact, fire/EMS, or other reports created from or linked to the identified dispatch event.${scope}`,
    'retention-and-deletion-records': `Retention classifications, deletion schedules, deletion events, preservation holds, or records showing the preservation status of responsive call audio, radio audio, CAD, or dispatch data.${scope}`,
    'redaction-and-withholding-records': `Records identifying redactions, withheld audio or data, exemption/withholding determinations, redaction logs, and the stated basis for material not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validateDispatch911(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('location ')) issues.push({ field: 'location', message: 'Provide the incident location so the dispatch event can be identified.' })
  if (!corpus.includes('event date:')) issues.push({ field: 'incidentDate', message: 'Provide the incident date so the call and CAD records can be located.' })
  if (!corpus.includes('event description:')) issues.push({ field: 'subjectMatter', message: 'Describe the call, response, or incident in plain language.' })
  return issues
}

export function buildDispatch911RecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const location = text(input, 'location')
  const incidentDate = text(input, 'incidentDate')
  const subjectMatter = text(input, 'subjectMatter')
  const categories = selectedCategories(input)
  return {
    title: `911 & Dispatch Records — ${incidentNumber ?? location ?? incidentDate ?? 'Event'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare emergency-call, dispatch, CAD, radio, unit-response, and related records for the specified event.',
    scope: JSON.stringify({
      workflow: 'dispatch-911-records', incidentDate, timeStart: text(input, 'timeStart'), timeEnd: text(input, 'timeEnd'),
      incidentNumber, location, callerPhone: text(input, 'callerPhone'), person: text(input, 'person'),
      department: text(input, 'department'), subjectMatter,
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: incidentDate,
      dateEnd: incidentDate,
      custodian: text(input, 'department'),
      systemHint: category === 'cad-event-history' || category === 'unit-assignments-and-status' || category === 'event-timestamps-and-disposition'
        ? 'CAD / call-for-service system'
        : category.includes('audio') || category.includes('radio')
          ? '911 / dispatch recording or radio logging system'
          : undefined,
      format: category.includes('audio')
        ? 'native digital audio files where available, with associated metadata preserved separately'
        : category.includes('logs') || category === 'cad-event-history' || category === 'event-timestamps-and-disposition'
          ? 'native export, CSV, JSON, or other structured format where maintained'
          : undefined,
    })),
  }
}

export const DISPATCH_911_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_MEDIA', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const dispatch911RecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'dispatch-911-records',
  name: '911 Call & Dispatch Records Request',
  description: 'Build a focused request for 911 audio, call logs, CAD history, radio traffic, unit assignments, timestamps, incident reports, retention records, and withholding records.',
  searchIntent: '911 call records request',
  seo: {
    title: '911 Call Records Request — Audio, CAD & Dispatch Logs',
    description: 'Request 911 audio, call logs, CAD event history, radio traffic, unit assignments, response timestamps, and related dispatch records for a specific incident.',
    canonicalPath: '/workflows/dispatch-911-records',
  },
  intakeVersion: '1.0.0',
  intake: DISPATCH_911_INTAKE,
  capabilities: DISPATCH_911_CAPABILITIES,
  request: { categories: DISPATCH_911_RECORD_CATEGORIES, build: buildDispatch911RecordsRequest },
  validate: validateDispatch911,
  policies: [{
    jurisdiction: 'all', version: '1.0.0', rules: {
      requestNativeAudio: true,
      requestCadAndCallLogsSeparately: true,
      requestRetentionAndDeletionRecords: true,
      requestRedactionAndWithholdingRecords: true,
      preserveEventIdentifiersAndTimestamps: true,
      doNotTreatReferencedAudioAsProduced: true,
    },
  }],
  responseAnalysis: {
    findingTypes: DISPATCH_911_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('DISPATCH_911_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      const contradictions: Array<{ leftId: string; rightId: string; result: Awaited<ReturnType<typeof assessPoliceContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({ leftId: records[i].id, rightId: records[j].id, result: await assessPoliceContradiction(providers, records[i], records[j], policy) })
        }
      }
      const strategy = await recommendPoliceFollowUp(providers, {
        workflow: 'dispatch-911-records', deterministic, requestedItems: source.requestedItems ?? [], identifiers: source.identifiers ?? {},
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
