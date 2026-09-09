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

export const OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES = [
  'critical-incident-and-shooting-reports',
  'body-camera-dash-camera-and-scene-media',
  'cad-radio-and-dispatch-records',
  'officer-weapon-and-firearm-discharge-records',
  'scene-evidence-forensics-and-diagrams',
  'witness-interviews-and-statements',
  'supervisor-critical-incident-and-administrative-review',
  'prosecutor-or-external-review-records',
  'policy-training-and-directive-records',
  'retention-redaction-and-withholding-records',
] as const

export const OFFICER_INVOLVED_SHOOTING_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const OFFICER_INVOLVED_SHOOTING_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police, sheriff, state police, task force, campus police, or other agency involved in the shooting.' },
  { id: 'incidentDate', label: 'Incident date', required: true, helpText: 'Date of the officer-involved shooting or firearm-discharge event.' },
  { id: 'timeStart', label: 'Approximate start time', helpText: 'Beginning of the relevant incident/dispatch window.' },
  { id: 'timeEnd', label: 'Approximate end time', helpText: 'End of the relevant incident/dispatch window.' },
  { id: 'incidentNumber', label: 'Incident / report / CAD number', helpText: 'Incident, report, CAD, critical-incident, investigation, or case number when known.' },
  { id: 'location', label: 'Incident location', required: true, helpText: 'Address, roadway, parcel, business, residence, or other specific location.' },
  { id: 'person', label: 'Person shot / involved person', helpText: 'Name or other identifier for the civilian or other person involved.' },
  { id: 'officerNames', label: 'Officer names / badge numbers', helpText: 'Known involved or witness officers, badge numbers, unit numbers, or call signs.' },
  { id: 'externalAgency', label: 'Outside investigator / prosecutor', helpText: 'District attorney, attorney general, outside police agency, critical-incident team, or other reviewing body when known.' },
  { id: 'eventDescription', label: 'Incident description', required: true, helpText: 'Plain-English description of the shooting, firearm discharge, preceding encounter, or critical incident.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES]
  const known = new Set(OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'incidentNumber') && `incident/report/CAD number ${text(input, 'incidentNumber')}`,
    text(input, 'location') && `location ${text(input, 'location')}`,
    text(input, 'person') && `involved person ${text(input, 'person')}`,
    text(input, 'officerNames') && `officer identifiers ${text(input, 'officerNames')}`,
  ].filter(Boolean)
  const date = text(input, 'incidentDate')
  const start = text(input, 'timeStart')
  const end = text(input, 'timeEnd')
  const window = start || end ? `, approximately ${start ?? 'unknown start'} through ${end ?? 'unknown end'}` : ''
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${date ? ` Incident date: ${date}${window}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const event = text(input, 'eventDescription') ? ` Critical-incident description: ${text(input, 'eventDescription')}.` : ''
  const external = text(input, 'externalAgency') ? ` Known outside investigator/reviewer: ${text(input, 'externalAgency')}.` : ''
  const descriptions: Record<string, string> = {
    'critical-incident-and-shooting-reports': `Officer-involved-shooting, critical-incident, firearm-discharge, incident, offense, arrest, supplemental, investigative, and officer narrative reports concerning the identified event, including later supplements, corrections, and final public-facing summaries where maintained.${scope}`,
    'body-camera-dash-camera-and-scene-media': `Body-worn camera, dash/in-car camera, fixed-site agency video, aerial/drone video, scene photographs, evidence photographs, audio, and other agency-held media depicting the encounter, shooting, immediate aftermath, medical response, scene processing, or relevant officer actions, together with associated file identifiers and metadata.${scope}`,
    'cad-radio-and-dispatch-records': `CAD, call-for-service, dispatch, radio-event, radio-transmission, unit-assignment, timestamp, disposition, mutual-aid, supervisor-notification, and related communications records covering the event and immediate aftermath.${scope}`,
    'officer-weapon-and-firearm-discharge-records': `Firearm-discharge reports, weapon assignment or issuance records sufficient to identify the involved duty weapon, ammunition-count or round-accounting records, weapon/equipment inspection or evidence-submission records, and other non-privileged records documenting officer firearm discharge in the identified incident.${scope}`,
    'scene-evidence-forensics-and-diagrams': `Scene diagrams, measurements, evidence indexes, property/evidence logs, cartridge-case or projectile inventories, photographs, forensic-request records, laboratory submission records, reconstruction materials, and other scene/evidence records associated with the incident, to the extent maintained and disclosable.${scope}`,
    'witness-interviews-and-statements': `Recorded or written civilian, officer, first-responder, and other witness interviews or statements; interview logs; transcripts or summaries; and associated metadata concerning the identified incident, to the extent maintained and disclosable.${scope}`,
    'supervisor-critical-incident-and-administrative-review': `Supervisor, command, critical-incident, force-review, administrative, professional-standards, or comparable review records showing routing, findings, approval, policy review, referral, corrective action, or final administrative disposition, to the extent maintained and disclosable.${scope}`,
    'prosecutor-or-external-review-records': `Final public reports, declination or charging decision records, review letters, findings, memoranda, referral records, transmittal records, and other disclosable records from a prosecutor, attorney general, outside investigating agency, critical-incident team, inspector general, or comparable external reviewer concerning the incident.${scope}${external}`,
    'policy-training-and-directive-records': `Use-of-force, firearm-discharge, de-escalation, body-camera, critical-incident, medical-aid, reporting, supervisor-review, and related policies, training standards, directives, bulletins, or guidance in effect on the incident date, including materials cited or applied in later review.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, deletion/destruction records, redaction logs, withholding determinations, exemption records, sealing references, privilege logs where maintained, and records stating the basis for responsive critical-incident records or media not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${event}`
}

function validateOfficerInvolvedShooting(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('location ')) issues.push({ field: 'location', message: 'Provide the incident location.' })
  if (!corpus.includes('incident date:')) issues.push({ field: 'incidentDate', message: 'Provide the incident date.' })
  if (!corpus.includes('critical-incident description:')) issues.push({ field: 'eventDescription', message: 'Describe the shooting or firearm-discharge event in plain language.' })
  return issues
}

export function buildOfficerInvolvedShootingRecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const incidentDate = text(input, 'incidentDate')
  const location = text(input, 'location')
  const categories = selectedCategories(input)
  return {
    title: `Officer-Involved Shooting Records — ${incidentNumber ?? location ?? incidentDate ?? 'Incident'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare lawfully disclosable critical-incident reports, media, dispatch records, firearm-discharge records, scene evidence, interviews, administrative and external review, policies, and withholding evidence associated with the specified officer-involved shooting.',
    scope: JSON.stringify({
      workflow: 'officer-involved-shooting-records',
      incidentDate,
      timeStart: text(input, 'timeStart'),
      timeEnd: text(input, 'timeEnd'),
      incidentNumber,
      location,
      person: text(input, 'person'),
      officerNames: text(input, 'officerNames'),
      externalAgency: text(input, 'externalAgency'),
      eventDescription: text(input, 'eventDescription'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: incidentDate,
      dateEnd: incidentDate,
      custodian: category === 'prosecutor-or-external-review-records' ? text(input, 'externalAgency') : undefined,
      systemHint:
        category === 'cad-radio-and-dispatch-records'
          ? 'CAD / radio / dispatch system'
          : category === 'body-camera-dash-camera-and-scene-media'
            ? 'digital evidence management system'
            : category === 'scene-evidence-forensics-and-diagrams'
              ? 'evidence / property / forensic case-management system'
              : category === 'supervisor-critical-incident-and-administrative-review'
                ? 'critical incident / professional standards / force review system'
                : undefined,
      format:
        category === 'cad-radio-and-dispatch-records'
          ? 'native export, CSV, JSON, or other structured format where maintained'
          : category === 'body-camera-dash-camera-and-scene-media'
            ? 'native digital media files where available, with associated metadata preserved separately'
            : undefined,
    })),
  }
}

export const OFFICER_INVOLVED_SHOOTING_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_MEDIA', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const officerInvolvedShootingRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'officer-involved-shooting-records',
  name: 'Officer-Involved Shooting Records Request',
  description: 'Build an incident-specific request for critical-incident/shooting reports, body/dash/scene media, CAD/radio, firearm-discharge records, evidence and forensics, witness statements, administrative and outside review, policies, and withholding evidence.',
  searchIntent: 'officer involved shooting records request',
  seo: {
    title: 'Officer-Involved Shooting Records Request — Reports, Video & Review Records',
    description: 'Request lawfully disclosable officer-involved shooting reports, body-camera video, CAD/radio, firearm-discharge records, evidence indexes, witness statements, review records, policies, and withholding records.',
    canonicalPath: '/workflows/officer-involved-shooting-records',
  },
  intakeVersion: '1.0.0',
  intake: OFFICER_INVOLVED_SHOOTING_INTAKE,
  capabilities: OFFICER_INVOLVED_SHOOTING_CAPABILITIES,
  request: { categories: OFFICER_INVOLVED_SHOOTING_RECORD_CATEGORIES, build: buildOfficerInvolvedShootingRecordsRequest },
  validate: validateOfficerInvolvedShooting,
  policies: [{
    jurisdiction: 'all',
    version: '1.0.0',
    rules: {
      requestIncidentSpecificRecords: true,
      requestNativeMediaSeparately: true,
      requestFirearmDischargeRecordsSeparately: true,
      requestAdministrativeAndExternalReviewSeparately: true,
      requestPoliciesEffectiveOnIncidentDate: true,
      doNotAssumeInvestigativeOrPersonnelMaterialIsPublic: true,
      requestDisclosableRecordsAndSegregablePortions: true,
      requestRetentionAndWithholdingRecords: true,
      preserveIdentifiersAndTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: OFFICER_INVOLVED_SHOOTING_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('OFFICER_INVOLVED_SHOOTING_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
        workflow: 'officer-involved-shooting-records',
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
