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

export const CRIMINAL_HISTORY_CATEGORIES = [
  'repository-search-index-and-subject-identifiers',
  'arrest-event-and-booking-history',
  'charge-referral-and-prosecution-history',
  'court-disposition-and-conviction-history',
  'sentence-custody-corrections-and-supervision-history',
  'warrant-case-and-docket-reference-history',
  'source-agency-contributor-and-cross-reference-records',
  'record-correction-challenge-and-audit-status',
  'sealing-expungement-set-aside-and-access-restriction-status',
  'search-certification-no-record-and-withholding-records',
] as const

export const CRIMINAL_HISTORY_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const CRIMINAL_HISTORY_INTAKE = [
  { id: 'agency', label: 'Criminal-history repository / agency', required: true, helpText: 'State repository, DOJ, FBI, court repository, law-enforcement records unit, or other lawful custodian.' },
  { id: 'personName', label: 'Subject name', required: true, helpText: 'Full legal name of the person whose history is being requested.' },
  { id: 'dateOfBirth', label: 'Date of birth', helpText: 'Use only when needed to distinguish the subject from people with similar names.' },
  { id: 'aliases', label: 'Known aliases / prior names', helpText: 'Known aliases or prior names that may help locate matching records.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the history period to search.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the history period to search.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'State, county, federal district, or other jurisdiction relevant to the search.' },
  { id: 'accessBasis', label: 'Requester capacity / access basis', required: true, helpText: 'For example: requesting your own record, authorized representative, or public-records request for lawfully disclosable information.' },
  { id: 'subjectMatter', label: 'Records sought', required: true, helpText: 'Plain-English description of the criminal-history records or accuracy issue you need addressed.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...CRIMINAL_HISTORY_CATEGORIES]
  const known = new Set(CRIMINAL_HISTORY_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof CRIMINAL_HISTORY_CATEGORIES[number]),
  )
  return selected.length ? selected : [...CRIMINAL_HISTORY_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'personName') && `subject ${text(input, 'personName')}`,
    text(input, 'dateOfBirth') && `date of birth ${text(input, 'dateOfBirth')}`,
    text(input, 'aliases') && `known aliases/prior names ${text(input, 'aliases')}`,
    text(input, 'jurisdiction') && `jurisdiction ${text(input, 'jurisdiction')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${ids.length ? ` Search using: ${ids.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subjectMatter = text(input, 'subjectMatter') ? ` Records sought: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'repository-search-index-and-subject-identifiers': `Repository search results, record indexes, subject-match records, repository identifiers, search keys actually used, and non-sensitive subject identifiers sufficient to determine which records were associated with the identified person. Do not include passwords, authentication secrets, biometric templates, or protected identity-verification credentials.${scope}`,
    'arrest-event-and-booking-history': `Lawfully accessible criminal-history entries identifying arrests, booking events, arresting agencies, arrest/event numbers, arrest dates, alleged offenses recorded at arrest, and cross-references needed to trace each event to its source record.${scope}`,
    'charge-referral-and-prosecution-history': `Criminal-history entries or source references identifying charges referred for prosecution, charging-agency/prosecutor references, filed or amended charges where maintained, and identifiers needed to connect an arrest event to the corresponding prosecution record.${scope}`,
    'court-disposition-and-conviction-history': `Disposition and conviction entries, court identifiers, case/docket numbers, plea/verdict/disposition status, dismissal or acquittal entries, conviction entries, and dates sufficient to distinguish an arrest allegation from the final court outcome.${scope}`,
    'sentence-custody-corrections-and-supervision-history': `Lawfully accessible sentence, custody, corrections, probation, parole, supervision, discharge, completion, or release-status entries maintained as part of the criminal-history record, excluding protected treatment, medical, or confidential supervision details.${scope}`,
    'warrant-case-and-docket-reference-history': `Criminal-history references to warrants, cases, dockets, or court events sufficient to identify the referenced judicial record and its recorded status, without requesting operational law-enforcement intelligence or attempting to obtain restricted warrant-service information.${scope}`,
    'source-agency-contributor-and-cross-reference-records': `Contributing-agency identifiers, source-agency references, transaction/control numbers, case/arrest/booking/docket cross-references, and other provenance fields sufficient to identify where each material history entry originated.${scope}`,
    'record-correction-challenge-and-audit-status': `Records of subject-initiated corrections, challenges, disputes, amendments, identity-mismatch reviews, duplicate-person reviews, agency responses, correction status, and non-sensitive audit history showing material changes to the subject's criminal-history record.${scope}`,
    'sealing-expungement-set-aside-and-access-restriction-status': `Lawfully disclosable entries or status records identifying sealing, expungement, set-aside, dismissal, pardon-related status where maintained, access restriction, suppression from public dissemination, or later restoration/unsealing. Do not request the contents of sealed or restricted material unless lawful access exists.${scope}`,
    'search-certification-no-record-and-withholding-records': `Search certifications, no-record responses, repository scope statements, search-method summaries, retention status, redaction or withholding notices, stated access restrictions, and records sufficient to understand why responsive criminal-history information was not produced.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subjectMatter}`
}

function validateCriminalHistory(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('subject ')) issues.push({ field: 'personName', message: 'Provide the subject name for the criminal-history search.' })
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the criminal-history period.' })
  if (!corpus.includes('records sought:')) issues.push({ field: 'subjectMatter', message: 'Describe the criminal-history records or accuracy issue sought.' })
  return issues
}

export function buildCriminalHistoryRequest(input: Record<string, unknown>) {
  const personName = text(input, 'personName')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Criminal History — ${personName ?? 'Subject'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, obtain, and reconcile lawfully accessible criminal-history entries with their source agencies, arrest events, prosecution references, court dispositions, corrections/supervision status, provenance, correction history, and access-status records.',
    scope: JSON.stringify({
      workflow: 'criminal-history',
      personName,
      dateOfBirth: text(input, 'dateOfBirth'),
      aliases: text(input, 'aliases'),
      dateStart: start,
      dateEnd: end,
      jurisdiction: text(input, 'jurisdiction'),
      accessBasis: text(input, 'accessBasis'),
      subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      systemHint: category === 'repository-search-index-and-subject-identifiers' || category === 'source-agency-contributor-and-cross-reference-records'
        ? 'criminal-history repository / index system'
        : undefined,
      format: category === 'repository-search-index-and-subject-identifiers' || category === 'source-agency-contributor-and-cross-reference-records'
        ? 'native export, CSV, JSON, spreadsheet, or other structured format where lawfully available'
        : undefined,
    })),
  }
}

export const CRIMINAL_HISTORY_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionCriminalHistoryWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'criminal-history',
  name: 'Criminal History Request',
  description: 'Build a subject-specific request for criminal-history repository entries, arrests, charge/prosecution references, court dispositions, convictions, custody/supervision status, source-agency provenance, correction history, and sealing/access-status records.',
  searchIntent: 'criminal history request',
  seo: {
    title: 'Criminal History Request — Arrests, Dispositions, Convictions & Source Records',
    description: 'Request lawfully accessible criminal-history entries and source references for arrests, charges, court dispositions, convictions, corrections/supervision status, record corrections, and access restrictions.',
    canonicalPath: '/workflows/criminal-history',
  },
  intakeVersion: '2.0.0',
  intake: CRIMINAL_HISTORY_INTAKE,
  capabilities: CRIMINAL_HISTORY_CAPABILITIES,
  request: { categories: CRIMINAL_HISTORY_CATEGORIES, build: buildCriminalHistoryRequest },
  validate: validateCriminalHistory,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      doNotCircumventRestrictedCriminalHistoryRepositories: true,
      doNotImpersonateSubjectOrMisstateAuthorization: true,
      doNotRequestAuthenticationSecretsOrBiometricTemplates: true,
      doNotRequestProtectedJuvenileSealedOrExpungedContentsWithoutLawfulAccess: true,
      doNotConflateArrestChargeAndConviction: true,
      preserveSourceAgencyAndDispositionProvenance: true,
      requestOnlyLawfullyAccessibleRecordsAndSegregablePortions: true,
      requestSearchAndWithholdingEvidenceWhenRecordsAreUnavailable: true,
    },
  }],
  responseAnalysis: {
    findingTypes: CRIMINAL_HISTORY_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('CRIMINAL_HISTORY_ANALYSIS_INPUT_INVALID')
      const source = input as {
        requestedItems?: readonly { category: string; description: string }[]
        records?: readonly GenericProductionRecord[]
      }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzeGenericProduction(requested, records, 'criminal-history record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'criminal-history', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'criminal-history', policy),
      })))
      const contradictions: Array<{
        leftId: string
        rightId: string
        result: Awaited<ReturnType<typeof assessGenericRecordContradiction>>
      }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'criminal-history', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'criminal-history', {
        deterministic,
        requestedItems: source.requestedItems ?? [],
        records: records.slice(0, 20).map((record) => ({ id: record.id, filename: record.filename, category: record.category, text: record.text ?? '' })),
        extracted: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value })),
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
          .map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value, providers: item.result.providers })),
      }
    },
  },
})
