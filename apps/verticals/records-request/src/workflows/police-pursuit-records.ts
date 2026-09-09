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

export const POLICE_PURSUIT_RECORD_CATEGORIES = [
  'pursuit-and-incident-reports',
  'cad-radio-and-dispatch-records',
  'body-camera-dash-camera-and-air-support-media',
  'gps-avl-and-vehicle-telematics',
  'unit-officer-and-vehicle-assignments',
  'supervisor-and-pursuit-review-records',
  'collision-traffic-and-scene-records',
  'injury-damage-and-medical-response-records',
  'policy-training-and-pursuit-directives',
  'retention-redaction-and-withholding-records',
] as const

export const POLICE_PURSUIT_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const POLICE_PURSUIT_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police, sheriff, highway patrol, state police, campus police, or other agency involved in the pursuit.' },
  { id: 'incidentDate', label: 'Pursuit date', required: true, helpText: 'Date the pursuit occurred.' },
  { id: 'timeStart', label: 'Approximate start time', helpText: 'Beginning of the pursuit or relevant dispatch window.' },
  { id: 'timeEnd', label: 'Approximate end time', helpText: 'End of the pursuit or relevant dispatch window.' },
  { id: 'incidentNumber', label: 'Incident / report / CAD number', helpText: 'Incident, report, CAD, call-for-service, pursuit, or crash number when known.' },
  { id: 'startLocation', label: 'Pursuit start location', required: true, helpText: 'Address, roadway, intersection, landmark, or area where the pursuit began.' },
  { id: 'endLocation', label: 'Pursuit end location', helpText: 'Address, roadway, intersection, landmark, or area where the pursuit ended.' },
  { id: 'personVehicle', label: 'Person / pursued vehicle', helpText: 'Driver name, vehicle description, plate, VIN, or other identifying information.' },
  { id: 'officerUnits', label: 'Officer / unit identifiers', helpText: 'Officer names, badge numbers, unit numbers, call signs, vehicle numbers, or air-unit identifiers.' },
  { id: 'eventDescription', label: 'Pursuit description', required: true, helpText: 'Plain-English description of the pursuit, termination, collision, arrest, or other event.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...POLICE_PURSUIT_RECORD_CATEGORIES]
  const known = new Set(POLICE_PURSUIT_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof POLICE_PURSUIT_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...POLICE_PURSUIT_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'incidentNumber') && `incident/report/CAD number ${text(input, 'incidentNumber')}`,
    text(input, 'startLocation') && `start location ${text(input, 'startLocation')}`,
    text(input, 'endLocation') && `end location ${text(input, 'endLocation')}`,
    text(input, 'personVehicle') && `person/vehicle ${text(input, 'personVehicle')}`,
    text(input, 'officerUnits') && `officer/unit identifiers ${text(input, 'officerUnits')}`,
  ].filter(Boolean)
  const date = text(input, 'incidentDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const window = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  return `${ids.length ? ` Search using: ${ids.join('; ')}.` : ''}${date ? ` Pursuit date: ${date}${window}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const event = text(input, 'eventDescription') ? ` Pursuit/event description: ${text(input, 'eventDescription')}.` : ''
  const descriptions: Record<string, string> = {
    'pursuit-and-incident-reports': `Vehicle-pursuit reports, pursuit forms, incident/offense reports, arrest reports, supplemental reports, termination records, officer narratives, and later corrections or supplements concerning the identified pursuit.${scope}`,
    'cad-radio-and-dispatch-records': `CAD, dispatch, call-for-service, radio-event, radio-transmission, unit-status, timestamp, disposition, mutual-aid, and related communications records covering initiation through termination and immediate aftermath of the pursuit.${scope}`,
    'body-camera-dash-camera-and-air-support-media': `Body-worn camera, dash/in-car camera, fixed-site agency video, helicopter or aircraft video, drone video, and other agency-held media depicting or recording the pursuit, stop, collision, arrest, or termination, with associated file identifiers and metadata.${scope}`,
    'gps-avl-and-vehicle-telematics': `GPS, automatic vehicle location, fleet telematics, speed, route, location-history, emergency-equipment activation, vehicle-event, or comparable electronic records for involved agency vehicles or units, where maintained.${scope}`,
    'unit-officer-and-vehicle-assignments': `Duty rosters, officer/unit assignments, call signs, vehicle numbers, fleet assignments, shift records, air-unit assignments, and records sufficient to map participating personnel to vehicles and units during the pursuit.${scope}`,
    'supervisor-and-pursuit-review-records': `Supervisor review, command review, pursuit-review forms, pursuit-board records, approval/disapproval findings, policy-compliance findings, routing history, corrective-action referrals, and documented supervisory comments, to the extent maintained and disclosable.${scope}`,
    'collision-traffic-and-scene-records': `Collision reports, traffic-crash reports, diagrams, measurements, scene photographs, roadway evidence, traffic-camera references, reconstruction records, citations, and other agency records concerning any collision or crash associated with the pursuit.${scope}`,
    'injury-damage-and-medical-response-records': `Agency-maintained records documenting injuries, requests for medical assistance, EMS response, vehicle/property damage, towing, repair, damage estimates, medical-clearance references, and related non-privileged incident documentation.${scope}`,
    'policy-training-and-pursuit-directives': `Pursuit policies, emergency-driving policies, supervisor duties, termination criteria, intervention-technique policies, training standards, directives, bulletins, and guidance in effect on the pursuit date, including materials cited or applied in later review.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, deletion or destruction records, redaction logs, withholding determinations, exemption records, privilege logs where maintained, and records stating the basis for responsive pursuit records or media not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${event}`
}

function validatePolicePursuit(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('start location ')) issues.push({ field: 'startLocation', message: 'Provide the pursuit start location.' })
  if (!corpus.includes('pursuit date:')) issues.push({ field: 'incidentDate', message: 'Provide the pursuit date.' })
  if (!corpus.includes('pursuit/event description:')) issues.push({ field: 'eventDescription', message: 'Describe the pursuit and how it ended.' })
  return issues
}

export function buildPolicePursuitRecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const incidentDate = text(input, 'incidentDate')
  const startLocation = text(input, 'startLocation')
  const categories = selectedCategories(input)
  return {
    title: `Police Pursuit Records — ${incidentNumber ?? startLocation ?? incidentDate ?? 'Pursuit'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare pursuit reports, dispatch/radio records, media, vehicle telemetry, personnel/unit assignments, supervisory review, crash evidence, policy records, and withholding evidence associated with the specified police pursuit.',
    scope: JSON.stringify({
      workflow: 'police-pursuit-records',
      incidentDate,
      timeStart: text(input, 'timeStart'),
      timeEnd: text(input, 'timeEnd'),
      incidentNumber,
      startLocation,
      endLocation: text(input, 'endLocation'),
      personVehicle: text(input, 'personVehicle'),
      officerUnits: text(input, 'officerUnits'),
      eventDescription: text(input, 'eventDescription'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: incidentDate,
      dateEnd: incidentDate,
      systemHint:
        category === 'cad-radio-and-dispatch-records'
          ? 'CAD / radio / dispatch system'
          : category === 'gps-avl-and-vehicle-telematics'
            ? 'fleet GPS / AVL / telematics system'
            : category === 'body-camera-dash-camera-and-air-support-media'
              ? 'digital evidence management system'
              : category === 'supervisor-and-pursuit-review-records'
                ? 'pursuit review / professional standards system'
                : undefined,
      format:
        category === 'cad-radio-and-dispatch-records' || category === 'gps-avl-and-vehicle-telematics'
          ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : category === 'body-camera-dash-camera-and-air-support-media'
            ? 'native digital media files where available, with associated metadata preserved separately'
            : undefined,
    })),
  }
}

export const POLICE_PURSUIT_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_MEDIA', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const policePursuitRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'police-pursuit-records',
  name: 'Police Pursuit Records Request',
  description: 'Build an incident-specific request for pursuit reports, CAD/radio, body/dash/air media, GPS/AVL/telematics, unit assignments, supervisor review, crash records, injuries/damage, pursuit policies, and withholding/retention evidence.',
  searchIntent: 'police pursuit records request',
  seo: {
    title: 'Police Pursuit Records Request — Reports, Radio, Video & GPS Records',
    description: 'Request police pursuit reports, CAD and radio traffic, body/dash video, GPS or AVL data, unit assignments, supervisor review, crash records, pursuit policies, and withholding records.',
    canonicalPath: '/workflows/police-pursuit-records',
  },
  intakeVersion: '1.0.0',
  intake: POLICE_PURSUIT_INTAKE,
  capabilities: POLICE_PURSUIT_CAPABILITIES,
  request: { categories: POLICE_PURSUIT_RECORD_CATEGORIES, build: buildPolicePursuitRecordsRequest },
  validate: validatePolicePursuit,
  policies: [{
    jurisdiction: 'all',
    version: '1.0.0',
    rules: {
      requestIncidentSpecificRecords: true,
      requestNativeMediaSeparately: true,
      requestTelematicsInStructuredFormWhereMaintained: true,
      requestSupervisoryReviewSeparately: true,
      requestPoliciesEffectiveOnIncidentDate: true,
      requestRetentionAndWithholdingRecords: true,
      preserveIdentifiersAndTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: POLICE_PURSUIT_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('POLICE_PURSUIT_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
        workflow: 'police-pursuit-records',
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
