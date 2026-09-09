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

export const EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES = [
  'evidence-and-property-inventory',
  'chain-of-custody-and-transfer-history',
  'intake-booking-and-submission-records',
  'release-return-and-disposition-records',
  'destruction-disposal-and-authorization-records',
  'evidence-system-audit-and-access-history',
  'status-and-custodial-location-history',
  'laboratory-forensic-and-external-transfer-records',
  'policy-procedure-and-retention-schedule-records',
  'redaction-withholding-and-missing-records',
] as const

export const EVIDENCE_PROPERTY_ROOM_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const EVIDENCE_PROPERTY_ROOM_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police, sheriff, state police, prosecutor, or other agency that received or maintained the evidence/property.' },
  { id: 'incidentNumber', label: 'Incident / report / case number', helpText: 'Police report, incident, criminal case, evidence, property, or court case number when known.' },
  { id: 'evidenceNumber', label: 'Evidence / property number', helpText: 'Evidence tag, property receipt, item number, barcode, submission number, or other identifier when known.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant custody period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant custody period.' },
  { id: 'person', label: 'Associated person', helpText: 'Owner, arrestee, victim, suspect, claimant, or other person associated with the item.' },
  { id: 'itemDescription', label: 'Evidence / property description', required: true, helpText: 'Plain-English description of the item, media, device, sample, document, or property.' },
  { id: 'custodianUnit', label: 'Evidence / property unit', helpText: 'Evidence room, property unit, laboratory liaison, records unit, or other known custodian.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES]
  const known = new Set(EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'incidentNumber') && `incident/report/case number ${text(input, 'incidentNumber')}`,
    text(input, 'evidenceNumber') && `evidence/property identifier ${text(input, 'evidenceNumber')}`,
    text(input, 'person') && `associated person ${text(input, 'person')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const item = text(input, 'itemDescription') ? ` Evidence/property description: ${text(input, 'itemDescription')}.` : ''
  const descriptions: Record<string, string> = {
    'evidence-and-property-inventory': `Evidence/property inventory records, item lists, receipts, evidence tags, property records, barcode or item identifiers, item descriptions, quantity/status fields, and records sufficient to identify each responsive item associated with the matter.${scope}`,
    'chain-of-custody-and-transfer-history': `Chain-of-custody records, transfer logs, checkout/check-in history, custody acknowledgments, handoff records, transfer dates/times, responsible-person identifiers, and records sufficient to reconstruct the documented custody sequence for each responsive item.${scope}`,
    'intake-booking-and-submission-records': `Evidence/property intake records, booking records, submission forms, receiving records, packaging/submission documentation, initial condition/status records, and records identifying when and by whom responsive property entered agency custody.${scope}`,
    'release-return-and-disposition-records': `Release, return, owner-notification, claimant, disposition, court-order compliance, transfer-out, and final-status records sufficient to show whether and when responsive property left agency custody and under what documented authority.${scope}`,
    'destruction-disposal-and-authorization-records': `Destruction, disposal, forfeiture, abandonment, purge, or other final-disposition records; authorizations; approvals; notices; certificates; disposition logs; and records sufficient to show the documented authority, date, and final disposition of responsive property, to the extent disclosable.${scope}`,
    'evidence-system-audit-and-access-history': `Evidence-management-system audit history, record-change history, item-status changes, documented access/check-out events, user/action timestamps, and other audit records sufficient to identify material changes to responsive evidence/property records, while excluding security credentials or operational access information.${scope}`,
    'status-and-custodial-location-history': `Status history and custodial-location history recorded for responsive items, including documented movement between agency custody categories, laboratories, courts, officers, authorized external recipients, or disposition statuses, without requesting secure-facility access details or security-layout information.${scope}`,
    'laboratory-forensic-and-external-transfer-records': `Laboratory submission forms, forensic-service requests, external-agency transfer records, courier/receipt records, return records, laboratory case or submission identifiers, and records sufficient to correlate responsive property with outside testing or authorized transfer.${scope}`,
    'policy-procedure-and-retention-schedule-records': `Evidence/property policies, chain-of-custody procedures, intake and release procedures, disposition/destruction requirements, audit requirements, retention schedules, and policies in effect during the relevant custody period that govern the responsive property.${scope}`,
    'redaction-withholding-and-missing-records': `Retention classifications, preservation holds, deletion/destruction records for responsive data, redaction logs, withholding determinations, exemption records, privilege logs where maintained, unavailable/missing-item documentation, discrepancy reports, and records stating the basis for responsive material not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${item}`
}

function validateEvidencePropertyRoom(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((entry) => entry.description.toLowerCase()).join(' ')
  if (!corpus.includes('evidence/property description:')) {
    issues.push({ field: 'itemDescription', message: 'Describe the evidence or property in plain language.' })
  }
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the custody period.' })
  }
  if (!corpus.includes('incident/report/case number') && !corpus.includes('evidence/property identifier') && !corpus.includes('associated person')) {
    issues.push({ field: 'identifiers', message: 'Provide at least one case/incident number, evidence/property identifier, or associated person.' })
  }
  return issues
}

export function buildEvidencePropertyRoomRecordsRequest(input: Record<string, unknown>) {
  const incidentNumber = text(input, 'incidentNumber')
  const evidenceNumber = text(input, 'evidenceNumber')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Evidence & Property Records — ${evidenceNumber ?? incidentNumber ?? text(input, 'itemDescription') ?? 'Item'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare evidence/property inventory, custody, intake, transfer, release/disposition, audit, status, laboratory, policy, retention, and withholding records associated with the specified item or matter.',
    scope: JSON.stringify({
      workflow: 'evidence-property-room-records',
      incidentNumber,
      evidenceNumber,
      dateStart: start,
      dateEnd: end,
      person: text(input, 'person'),
      itemDescription: text(input, 'itemDescription'),
      custodianUnit: text(input, 'custodianUnit'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'custodianUnit'),
      systemHint:
        category === 'evidence-and-property-inventory' ||
        category === 'chain-of-custody-and-transfer-history' ||
        category === 'evidence-system-audit-and-access-history' ||
        category === 'status-and-custodial-location-history'
          ? 'evidence / property management system'
          : category === 'laboratory-forensic-and-external-transfer-records'
            ? 'forensic submission / laboratory liaison system'
            : undefined,
      format:
        category === 'evidence-and-property-inventory' ||
        category === 'chain-of-custody-and-transfer-history' ||
        category === 'evidence-system-audit-and-access-history' ||
        category === 'status-and-custodial-location-history'
          ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
          : undefined,
    })),
  }
}

export const EVIDENCE_PROPERTY_ROOM_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'INCIDENT_IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_MEDIA', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const evidencePropertyRoomRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'evidence-property-room-records',
  name: 'Evidence & Property Room Records Request',
  description: 'Build an item-specific request for evidence/property inventory, chain of custody, intake, release/disposition, destruction authorization, audit history, status/custodial movement, laboratory transfers, policies, retention, and withholding evidence.',
  searchIntent: 'police evidence property room records request',
  seo: {
    title: 'Evidence & Property Room Records Request — Chain of Custody & Disposition',
    description: 'Request police evidence and property inventory, chain-of-custody, intake, transfer, release, destruction/disposition, audit-history, laboratory, retention, and withholding records.',
    canonicalPath: '/workflows/evidence-property-room-records',
  },
  intakeVersion: '1.0.0',
  intake: EVIDENCE_PROPERTY_ROOM_INTAKE,
  capabilities: EVIDENCE_PROPERTY_ROOM_CAPABILITIES,
  request: { categories: EVIDENCE_PROPERTY_ROOM_RECORD_CATEGORIES, build: buildEvidencePropertyRoomRecordsRequest },
  validate: validateEvidencePropertyRoom,
  policies: [{
    jurisdiction: 'all',
    version: '1.0.0',
    rules: {
      requestStructuredEvidenceSystemExportsWhereMaintained: true,
      requestChainOfCustodySeparately: true,
      requestDispositionAndDestructionAuthoritySeparately: true,
      requestAuditHistoryWithoutSecurityCredentialsOrFacilityAccessDetails: true,
      requestDisclosableRecordsAndSegregablePortions: true,
      requestRetentionAndWithholdingRecords: true,
      preserveItemIdentifiersAndCustodyTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: EVIDENCE_PROPERTY_ROOM_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('EVIDENCE_PROPERTY_ROOM_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
        workflow: 'evidence-property-room-records',
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
