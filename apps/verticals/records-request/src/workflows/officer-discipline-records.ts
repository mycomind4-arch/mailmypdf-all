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

export const OFFICER_DISCIPLINE_RECORD_CATEGORIES = [
  'officer-identity-and-employment-status',
  'disciplinary-findings-and-final-outcomes',
  'sustained-misconduct-records',
  'certification-licensing-and-decertification-records',
  'separation-resignation-and-last-chance-records',
  'brady-giglio-and-credibility-disclosure-records',
  'policy-training-and-remedial-action-records',
  'appeal-grievance-and-review-records',
  'disciplinary-indexes-and-case-tracking',
  'retention-redaction-and-withholding-records',
] as const

export const OFFICER_DISCIPLINE_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const OFFICER_DISCIPLINE_INTAKE = [
  { id: 'agency', label: 'Law-enforcement agency', required: true, helpText: 'Current or former employing police department, sheriff, state police, campus police, or other agency.' },
  { id: 'officerName', label: 'Officer / employee name', required: true, helpText: 'Full name when known.' },
  { id: 'badgeNumber', label: 'Badge / employee number', helpText: 'Badge, employee, POST, certification, or other identifier when known.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the period to search.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the period to search.' },
  { id: 'state', label: 'State / jurisdiction', helpText: 'State or jurisdiction relevant to disclosure and certification rules.' },
  { id: 'incidentNumber', label: 'Related complaint / incident number', helpText: 'Optional IA, complaint, incident, arrest, civil, or case number connected to the discipline.' },
  { id: 'conduct', label: 'Conduct or discipline topic', helpText: 'Optional conduct, sustained finding, discipline, certification issue, resignation, or credibility topic.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...OFFICER_DISCIPLINE_RECORD_CATEGORIES]
  const known = new Set(OFFICER_DISCIPLINE_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof OFFICER_DISCIPLINE_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...OFFICER_DISCIPLINE_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const officer = text(input, 'officerName')
  const badge = text(input, 'badgeNumber')
  const incident = text(input, 'incidentNumber')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const identifiers = [
    officer && `officer/employee ${officer}`,
    badge && `badge/employee/certification identifier ${badge}`,
    incident && `related complaint/incident number ${incident}`,
  ].filter(Boolean)
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const topic = text(input, 'conduct') ? ` Conduct/discipline topic: ${text(input, 'conduct')}.` : ''
  const descriptions: Record<string, string> = {
    'officer-identity-and-employment-status': `Records sufficient to identify the officer or employee, employing agency, badge/employee identifiers, assignments or ranks relevant to the search period, dates of employment, and current or final employment status, to the extent maintained and disclosable.${scope}`,
    'disciplinary-findings-and-final-outcomes': `Final disciplinary findings, final notices of discipline, disposition records, sustained findings, final orders, settlement or resolution records, and records sufficient to show the final outcome of completed disciplinary matters, to the extent maintained and disclosable.${scope}`,
    'sustained-misconduct-records': `Records of sustained misconduct findings and final factual findings concerning completed matters involving the identified officer or employee, including the category of misconduct and disposition, to the extent maintained and disclosable.${scope}`,
    'certification-licensing-and-decertification-records': `Peace-officer certification, licensing, POST-status, suspension, revocation, surrender, decertification, reinstatement, reporting, and related state-certification records associated with the identified officer, to the extent maintained and disclosable.${scope}`,
    'separation-resignation-and-last-chance-records': `Records sufficient to show resignation, retirement, termination, separation, resignation in lieu of discipline, last-chance agreements, final separation status, or comparable completed employment outcomes connected to disciplinary or certification proceedings, to the extent maintained and disclosable.${scope}`,
    'brady-giglio-and-credibility-disclosure-records': `Records sufficient to identify Brady, Giglio, credibility, impeachment, prosecutor-notification, disclosure-list, or comparable determinations concerning the identified officer where such records are maintained and lawfully disclosable; if specific records are withheld, provide segregable portions and the basis for withholding.${scope}`,
    'policy-training-and-remedial-action-records': `Policies, directives, training standards, remedial training, corrective-action records, and policy provisions identified, cited, applied, or relied on in a completed disciplinary or certification matter involving the identified officer, to the extent maintained and disclosable.${scope}`,
    'appeal-grievance-and-review-records': `Final appeal, grievance, arbitration, civil-service, administrative-review, command-review, or comparable records showing whether discipline or findings were affirmed, modified, reversed, settled, remanded, or otherwise resolved, to the extent maintained and disclosable.${scope}`,
    'disciplinary-indexes-and-case-tracking': `Disciplinary case indexes, complaint/IA case numbers, tracking logs, disposition codes, certification-reporting logs, matter lists, and other structured records sufficient to identify responsive completed matters and their status.${scope}`,
    'retention-redaction-and-withholding-records': `Retention classifications, preservation holds, destruction/deletion records, redaction logs, withholding determinations, exemption records, privilege logs where maintained, and records stating the basis for responsive material not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${topic}`
}

function validateOfficerDiscipline(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('officer/employee ')) {
    issues.push({ field: 'officerName', message: 'Provide the officer or employee name.' })
  }
  if (!corpus.includes('cover ')) {
    issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the records search.' })
  }
  return issues
}

export function buildOfficerDisciplineRecordsRequest(input: Record<string, unknown>) {
  const officerName = text(input, 'officerName')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)

  return {
    title: `Officer Discipline Records — ${officerName ?? 'Officer'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'state') ?? text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare lawfully disclosable records concerning completed officer disciplinary outcomes, sustained misconduct, certification status, separation, credibility disclosures, review, and withholding.',
    scope: JSON.stringify({
      workflow: 'officer-discipline-records',
      officerName,
      badgeNumber: text(input, 'badgeNumber'),
      dateStart: start,
      dateEnd: end,
      state: text(input, 'state'),
      incidentNumber: text(input, 'incidentNumber'),
      conduct: text(input, 'conduct'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      systemHint:
        category === 'disciplinary-indexes-and-case-tracking' || category === 'disciplinary-findings-and-final-outcomes'
          ? 'internal affairs / professional standards / personnel case-management system'
          : category === 'certification-licensing-and-decertification-records'
            ? 'state peace-officer standards / certification system'
            : undefined,
      format: category === 'disciplinary-indexes-and-case-tracking'
        ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained'
        : undefined,
    })),
  }
}

export const OFFICER_DISCIPLINE_FINDINGS = [
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

export const officerDisciplineRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'officer-discipline-records',
  name: 'Officer Discipline & Certification Records Request',
  description: 'Build a jurisdiction-sensitive request for final disciplinary outcomes, sustained misconduct, officer certification or decertification status, separation records, credibility disclosures, review records, structured indexes, and withholding evidence.',
  searchIntent: 'police officer disciplinary records request',
  seo: {
    title: 'Police Officer Disciplinary Records Request — Discipline & Certification',
    description: 'Request lawfully disclosable police disciplinary outcomes, sustained misconduct records, certification or decertification records, separation outcomes, credibility disclosures, reviews, and withholding records.',
    canonicalPath: '/workflows/officer-discipline-records',
  },
  intakeVersion: '1.0.0',
  intake: OFFICER_DISCIPLINE_INTAKE,
  capabilities: OFFICER_DISCIPLINE_CAPABILITIES,
  request: {
    categories: OFFICER_DISCIPLINE_RECORD_CATEGORIES,
    build: buildOfficerDisciplineRecordsRequest,
  },
  validate: validateOfficerDiscipline,
  policies: [
    {
      jurisdiction: 'all',
      version: '1.0.0',
      rules: {
        doNotAssumePersonnelOrDisciplinaryRecordsArePublic: true,
        requestFinalOutcomesWhereLawfullyDisclosable: true,
        requestDisclosableRecordsAndSegregablePortions: true,
        doNotAssumeBradyGiglioListsArePublic: true,
        requestCertificationRecordsSeparately: true,
        requestStructuredIndexesWhereMaintained: true,
        requestRetentionAndWithholdingRecords: true,
      },
    },
  ],
  responseAnalysis: {
    findingTypes: OFFICER_DISCIPLINE_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('OFFICER_DISCIPLINE_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
        workflow: 'officer-discipline-records',
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
