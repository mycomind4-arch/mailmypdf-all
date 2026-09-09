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

export const INTERNAL_AFFAIRS_RECORD_CATEGORIES = [
  'complaint-intake-and-tracking',
  'internal-affairs-investigation-records',
  'professional-standards-review-records',
  'interviews-and-statements',
  'evidence-and-media-indexes',
  'findings-and-disposition-records',
  'supervisory-and-command-review',
  'policy-training-and-directive-records',
  'referral-and-corrective-action-records',
  'retention-redaction-and-withholding-records',
] as const

export const INTERNAL_AFFAIRS_CAPABILITIES: readonly RecordsDomainCapability[] = [
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

export const INTERNAL_AFFAIRS_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Police department, sheriff, state police, campus police, or other agency.' },
  { id: 'department', label: 'Professional standards / internal affairs unit', helpText: 'Internal affairs, professional standards, civilian oversight, inspector general, records, or another likely custodian.' },
  { id: 'complaintNumber', label: 'Complaint / IA case number', helpText: 'Complaint, internal-affairs, professional-standards, or oversight case number when known.' },
  { id: 'incidentNumber', label: 'Related incident / report number', helpText: 'Incident, arrest, report, CAD, or other event number associated with the complaint.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant complaint/investigation period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant complaint/investigation period.' },
  { id: 'person', label: 'Complainant / involved person', helpText: 'Name or other identifier for the complainant or person involved.' },
  { id: 'officerNames', label: 'Officer / employee names or identifiers', helpText: 'Known names, badge numbers, employee numbers, units, or assignments.' },
  { id: 'allegation', label: 'Complaint or allegation', required: true, helpText: 'Plain-English description of the conduct, incident, policy issue, or complaint being researched.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...INTERNAL_AFFAIRS_RECORD_CATEGORIES]
  const known = new Set(INTERNAL_AFFAIRS_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof INTERNAL_AFFAIRS_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...INTERNAL_AFFAIRS_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'complaintNumber') && `complaint/IA case number ${text(input, 'complaintNumber')}`,
    text(input, 'incidentNumber') && `related incident/report number ${text(input, 'incidentNumber')}`,
    text(input, 'person') && `complainant/involved person ${text(input, 'person')}`,
    text(input, 'officerNames') && `officer/employee identifiers ${text(input, 'officerNames')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${ids.length ? ` Search using: ${ids.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const allegation = text(input, 'allegation') ? ` Complaint/allegation description: ${text(input, 'allegation')}.` : ''
  const descriptions: Record<string, string> = {
    'complaint-intake-and-tracking': `Complaint intake records, complaint forms, intake logs, tracking records, routing history, case identifiers, status history, acknowledgment records, and related complaint-management records associated with the identified matter.${scope}`,
    'internal-affairs-investigation-records': `Internal-affairs investigative records, investigative plans, assignments, investigator notes, chronology records, evidence references, investigative summaries, and related case-management records concerning the identified matter, to the extent maintained and disclosable.${scope}`,
    'professional-standards-review-records': `Professional-standards, inspector-general, civilian-oversight, integrity, or comparable review records associated with the identified complaint or incident, to the extent maintained and disclosable.${scope}`,
    'interviews-and-statements': `Recorded or written interviews, statements, summaries, interview logs, witness/complainant statements, employee statements, and associated metadata concerning the identified matter, to the extent maintained and disclosable.${scope}`,
    'evidence-and-media-indexes': `Evidence inventories, attachment lists, digital-evidence indexes, media indexes, referenced report lists, exhibits, file inventories, and cross-references used or reviewed in connection with the complaint or investigation.${scope}`,
    'findings-and-disposition-records': `Findings, disposition records, closing summaries, sustained/not-sustained or comparable outcome records, conclusion memoranda, notification records, and final case-status records concerning the identified matter, to the extent maintained and disclosable.${scope}`,
    'supervisory-and-command-review': `Supervisor, command, legal, risk-management, review-board, or executive review records showing review, approval, disagreement, remand, routing, comments, or disposition of the complaint/investigation.${scope}`,
    'policy-training-and-directive-records': `Policies, procedures, general orders, directives, bulletins, training materials, or guidance identified, cited, applied, or relied on in evaluating the conduct at issue, including versions effective during the relevant period.${scope}`,
    'referral-and-corrective-action-records': `Referral records, remedial or corrective-action referrals, training referrals, policy-review referrals, administrative follow-up records, or other non-privileged case-resolution records associated with the identified matter, to the extent maintained and disclosable.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, destruction/deletion records, redaction logs, withholding determinations, exemption records, privilege logs where maintained, and records stating the basis for material not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${allegation}`
}

function validateInternalAffairs(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('complaint/allegation description:')) {
    issues.push({ field: 'allegation', message: 'Describe the complaint, conduct, incident, or policy issue in plain language.' })
  }
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the complaint or investigation period.' })
  }
  if (
    !corpus.includes('complaint/ia case number') &&
    !corpus.includes('related incident/report number') &&
    !corpus.includes('officer/employee identifiers') &&
    !corpus.includes('complainant/involved person')
  ) {
    issues.push({ field: 'identifiers', message: 'Provide at least one complaint/case number, related incident number, involved person, or officer/employee identifier.' })
  }
  return issues
}

export function buildInternalAffairsRecordsRequest(input: Record<string, unknown>) {
  const complaintNumber = text(input, 'complaintNumber')
  const incidentNumber = text(input, 'incidentNumber')
  const person = text(input, 'person')
  const allegation = text(input, 'allegation')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)

  return {
    title: `Internal Affairs Records — ${complaintNumber ?? incidentNumber ?? person ?? 'Complaint'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare complaint, investigation, evidence-index, findings, review, policy, and withholding records associated with the specified internal-affairs or professional-standards matter.',
    scope: JSON.stringify({
      workflow: 'internal-affairs-records',
      complaintNumber,
      incidentNumber,
      dateStart: start,
      dateEnd: end,
      person,
      officerNames: text(input, 'officerNames'),
      department: text(input, 'department'),
      allegation,
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'department'),
      systemHint:
        category === 'complaint-intake-and-tracking' ||
        category === 'internal-affairs-investigation-records' ||
        category === 'professional-standards-review-records'
          ? 'internal affairs / professional standards case-management system'
          : category === 'evidence-and-media-indexes'
            ? 'digital evidence / document management system'
            : undefined,
      format:
        category === 'complaint-intake-and-tracking' || category === 'evidence-and-media-indexes'
          ? 'native export, CSV, JSON, or other structured format where maintained'
          : undefined,
    })),
  }
}

export const INTERNAL_AFFAIRS_FINDINGS = [
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

export const internalAffairsRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'internal-affairs-records',
  name: 'Internal Affairs & Professional Standards Records Request',
  description: 'Build a targeted request for complaint intake, internal-affairs investigation records, professional-standards review, interviews, evidence indexes, findings, command review, policies, referrals, and withholding/retention records.',
  searchIntent: 'internal affairs records request',
  seo: {
    title: 'Internal Affairs Records Request — Police Complaint & Investigation Records',
    description: 'Request police internal-affairs and professional-standards complaint records, investigation materials, findings, evidence indexes, command review, policies, and withholding records.',
    canonicalPath: '/workflows/internal-affairs-records',
  },
  intakeVersion: '1.0.0',
  intake: INTERNAL_AFFAIRS_INTAKE,
  capabilities: INTERNAL_AFFAIRS_CAPABILITIES,
  request: {
    categories: INTERNAL_AFFAIRS_RECORD_CATEGORIES,
    build: buildInternalAffairsRecordsRequest,
  },
  validate: validateInternalAffairs,
  policies: [
    {
      jurisdiction: 'all',
      version: '1.0.0',
      rules: {
        doNotAssumePersonnelRecordsArePublic: true,
        requestDisclosableRecordsAndSegregablePortions: true,
        requestEvidenceIndexesSeparately: true,
        requestPoliciesEffectiveAtRelevantTime: true,
        requestRetentionAndWithholdingRecords: true,
        preserveComplaintAndIncidentIdentifiers: true,
      },
    },
  ],
  responseAnalysis: {
    findingTypes: INTERNAL_AFFAIRS_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') {
        throw new Error('INTERNAL_AFFAIRS_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
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
          workflow: 'internal-affairs-records',
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
