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
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police department, sheriff, state police, campus police, or other agency that may hold the recording.' },
  { id: 'department', label: 'Likely records / evidence unit', helpText: 'Records, evidence, digital evidence, professional standards, investigations, or another likely custodian.' },
  { id: 'incidentDate', label: 'Incident date', required: true, helpText: 'Date of the encounter or incident.' },
  { id: 'timeStart', label: 'Approximate start time', helpText: 'Beginning of the encounter window when known.' },
  { id: 'timeEnd', label: 'Approximate end time', helpText: 'End of the encounter window when known.' },
  { id: 'incidentNumber', label: 'Incident / report / CAD number', helpText: 'Case, report, CAD, call-for-service, or event number when known.' },
  { id: 'location', label: 'Incident location', required: true, helpText: 'Address, intersection, business, parcel, or other specific location.' },
  { id: 'person', label: 'Person involved', helpText: 'Name of a subject, victim, witness, caller, or other person associated with the encounter.' },
  { id: 'officerNames', label: 'Officer names / badge numbers', helpText: 'Known officer names, badge numbers, unit numbers, or other identifiers.' },
  { id: 'subjectMatter', label: 'What happened', required: true, helpText: 'Plain-English description of the encounter so the agency can identify responsive media and records.' },
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
    text(input, 'incidentNumber') && `incident/report/CAD number ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `location ${text(input, 'location')}`,
    text(input, 'person') && `person ${text(input, 'person')}`,
    text(input, 'officerNames') && `officer identifiers ${text(input, 'officerNames')}`,
  ].filter(Boolean)
  const date = text(input, 'incidentDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const time = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  return `${parts.length ? ` Search using: ${parts.join('; ')}.` : ''}${date ? ` Incident date: ${date}${time}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Encounter description: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'body-camera-recordings': `All body-worn camera recordings depicting or capturing the identified encounter, including separate recordings from each involved officer and any pre-event or post-event footage retained with the incident.${scope}`,
    'body-camera-metadata': `Native metadata associated with responsive body-worn camera files, including recording identifiers, device or camera identifiers, officer assignment, capture timestamps, duration, upload timestamps, file names, file hashes where maintained, and evidence-system identifiers.${scope}`,
    'activation-and-event-logs': `Activation, deactivation, buffering, event, synchronization, upload, tagging, categorization, and other system logs associated with the responsive body-worn camera recordings.${scope}`,
    'audit-and-access-logs': `Audit or access logs showing viewing, export, copying, modification, redaction, sharing, download, or other access events for the responsive recordings where maintained.${scope}`,
    'retention-and-deletion-records': `Retention classifications, retention-expiration records, deletion schedules, deletion events, preservation holds, or other records showing the preservation status of responsive body-worn camera material.${scope}`,
    'redaction-and-withholding-records': `Records identifying redactions, withheld segments, exemption or withholding determinations, redaction logs, redacted-export history, and the stated basis for any material not produced.${scope}`,
    'dispatch-and-cad': `Dispatch, CAD, call-for-service, unit assignment, timestamp, disposition, and related communications records that identify officers and time windows associated with the encounter.${scope}`,
    'incident-and-supplemental-reports': `Incident, offense, arrest, supplemental, use-of-force, field-contact, or other reports associated with the encounter that can identify responsive recordings and involved personnel.${scope}`,
    'evidence-indexes': `Evidence indexes, digital-evidence inventories, media indexes, attachment lists, evidence-property records, and cross-references showing body-camera files associated with the incident.${scope}`,
    'related-correspondence': `Correspondence, case notes, emails, referrals, disclosure notes, and communications concerning preservation, review, redaction, release, or handling of responsive body-camera material.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validateBodyCamera(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('location ')) {
    issues.push({ field: 'location', message: 'Provide the incident location so the agency can identify the encounter.' })
  }
  if (!corpus.includes('incident date:')) {
    issues.push({ field: 'incidentDate', message: 'Provide the incident date so responsive recordings can be located.' })
  }
  if (!corpus.includes('encounter description:')) {
    issues.push({ field: 'subjectMatter', message: 'Describe the encounter in plain language.' })
  }
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
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and review body-worn camera recordings and the metadata and records needed to determine whether the production is complete.',
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
      format: category === 'body-camera-recordings'
        ? 'native digital video files where available, with associated metadata preserved separately'
        : category === 'body-camera-metadata' || category.includes('logs')
          ? 'native export, CSV, JSON, or other structured format where maintained'
          : undefined,
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
  description: 'Build a focused request for body-worn camera recordings, native metadata, activation and audit logs, retention records, redaction records, CAD, reports, and evidence indexes.',
  searchIntent: 'body camera records request',
  seo: {
    title: 'Body Camera Records Request — Video, Metadata & Audit Logs',
    description: 'Request body-worn camera video plus metadata, activation logs, audit history, retention records, redaction records, CAD, and evidence indexes for a specific incident.',
    canonicalPath: '/workflows/body-camera-records',
  },
  intakeVersion: '1.0.0',
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
      version: '1.0.0',
      rules: {
        requestNativeMedia: true,
        requestMetadataSeparately: true,
        requestRetentionAndDeletionRecords: true,
        requestRedactionAndWithholdingRecords: true,
        preserveIncidentIdentifiers: true,
        doNotTreatReferencedMediaAsProduced: true,
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
