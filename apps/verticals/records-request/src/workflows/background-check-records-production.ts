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

export const BACKGROUND_CHECK_RECORD_CATEGORIES = [
  'background-check-report-and-result-summary',
  'search-scope-criteria-and-source-index',
  'criminal-history-component-and-source-references',
  'employment-education-license-and-credential-verification',
  'identity-match-disambiguation-and-alias-resolution-records',
  'adjudication-decision-and-status-records',
  'notice-consent-authorization-and-disclosure-records',
  'correction-dispute-and-reinvestigation-records',
  'source-contributor-and-cross-reference-records',
  'retention-redaction-withholding-and-access-status-records',
] as const

export const BACKGROUND_CHECK_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const BACKGROUND_CHECK_RECORD_INTAKE = [
  { id: 'agency', label: 'Agency / lawful records custodian', required: true, helpText: 'Agency, employer, licensing body, screening unit, or other custodian that lawfully maintains the requested records.' },
  { id: 'personName', label: 'Subject name', required: true, helpText: 'Name of the person whose own or otherwise lawfully accessible background-check records are being requested.' },
  { id: 'screeningDate', label: 'Screening / decision date', helpText: 'Date or approximate date the background check or adjudication occurred.' },
  { id: 'requestingOrganization', label: 'Requesting / sponsoring organization', helpText: 'Employer, agency, licensing body, program, or other organization associated with the check.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant records period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant records period.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'City, county, state, federal agency, or other jurisdiction.' },
  { id: 'accessBasis', label: 'Requester capacity / access basis', required: true, helpText: 'For example: requesting your own report, authorized representative, or request for records otherwise lawfully disclosable to you.' },
  { id: 'subjectMatter', label: 'Background-check issue / records sought', required: true, helpText: 'Describe the check, decision, disputed item, or records you need.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...BACKGROUND_CHECK_RECORD_CATEGORIES]
  const known = new Set(BACKGROUND_CHECK_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof BACKGROUND_CHECK_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...BACKGROUND_CHECK_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'personName') && `subject ${text(input, 'personName')}`,
    text(input, 'screeningDate') && `screening/decision date ${text(input, 'screeningDate')}`,
    text(input, 'requestingOrganization') && `requesting/sponsoring organization ${text(input, 'requestingOrganization')}`,
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
    'background-check-report-and-result-summary': `The subject's lawfully accessible background-check report, screening result, completed-check summary, determination summary, or equivalent final report maintained for the identified check, together with version/date information sufficient to identify what report was actually used.${scope}`,
    'search-scope-criteria-and-source-index': `Records identifying the lawful search scope, categories searched, date ranges, jurisdictions, databases or source classes consulted, search completion status, and source index for the identified check, excluding passwords, query credentials, protected investigative techniques, or system-security details.${scope}`,
    'criminal-history-component-and-source-references': `Lawfully accessible criminal-history components or references included in the identified check, together with case, court, repository, or source identifiers needed to trace each material item to its originating public or authorized source. Do not treat an arrest allegation as a conviction.${scope}`,
    'employment-education-license-and-credential-verification': `Verification records for employment, education, professional licenses, certifications, credentials, or other qualifications included in the identified check, including source, date, result, discrepancy, and follow-up status where lawfully accessible.${scope}`,
    'identity-match-disambiguation-and-alias-resolution-records': `Non-sensitive records showing how the custodian matched or disambiguated the subject, handled aliases or similar names, reviewed possible identity mismatches, and resolved duplicate-person issues. Do not request passwords, authentication secrets, biometric templates, or protected identity-verification credentials.${scope}`,
    'adjudication-decision-and-status-records': `Lawfully accessible adjudication records, eligibility/status records, decision dates, decision reasons, review status, and records identifying which reported items materially affected the identified screening decision, excluding protected security-clearance, classified, privileged, or otherwise restricted adjudicative material.${scope}`,
    'notice-consent-authorization-and-disclosure-records': `Notices, consent or authorization records, disclosure acknowledgments, subject-access notices, pre-decision or post-decision notices where maintained, and records sufficient to identify the lawful basis under which the check was obtained or disclosed.${scope}`,
    'correction-dispute-and-reinvestigation-records': `Records of disputes, corrections, subject challenges, reinvestigations, source verification, amended reports, corrected items, notices of correction, and final dispute status concerning the identified check.${scope}`,
    'source-contributor-and-cross-reference-records': `Source-provider identifiers, contributing agencies or institutions, report/source references, transaction/control numbers, case/license/credential cross-references, and other provenance fields sufficient to trace material report entries to their source.${scope}`,
    'retention-redaction-withholding-and-access-status-records': `Retention status, record-version history, redaction or withholding notices, stated access restrictions, deletion or expiration status, search certifications, and records sufficient to understand why a requested background-check record or component was unavailable.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subjectMatter}`
}

function validateBackgroundCheck(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('subject ')) issues.push({ field: 'personName', message: 'Provide the subject name for the background-check records request.' })
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the records period.' })
  if (!corpus.includes('records sought:')) issues.push({ field: 'subjectMatter', message: 'Describe the background check, decision, disputed item, or records sought.' })
  return issues
}

export function buildBackgroundCheckRecordsRequest(input: Record<string, unknown>) {
  const personName = text(input, 'personName')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Background Check Records — ${personName ?? 'Subject'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, obtain, and reconcile lawfully accessible background-check reports, search scope, source references, verification records, identity-match records, adjudication status, notices/authorization, disputes/corrections, provenance, and access-status records.',
    scope: JSON.stringify({
      workflow: 'background-check-records',
      personName,
      screeningDate: text(input, 'screeningDate'),
      requestingOrganization: text(input, 'requestingOrganization'),
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
      systemHint: category === 'search-scope-criteria-and-source-index' || category === 'source-contributor-and-cross-reference-records'
        ? 'screening / case-management / source-index system'
        : undefined,
      format: category === 'search-scope-criteria-and-source-index' || category === 'source-contributor-and-cross-reference-records'
        ? 'native export, CSV, JSON, spreadsheet, or other structured format where lawfully available'
        : undefined,
    })),
  }
}

export const BACKGROUND_CHECK_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionBackgroundCheckRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'background-check-records',
  name: 'Background Check Records Request',
  description: 'Build a subject-authorized or otherwise lawful request for background-check reports, search/source records, verification records, adjudication status, notices/authorization, disputes/corrections, provenance, and access-status records.',
  searchIntent: 'background check records request',
  seo: {
    title: 'Background Check Records Request — Report, Sources, Verification & Dispute Records',
    description: 'Request your own, authorized, or otherwise lawfully accessible background-check report, source records, verification records, decision status, notices, corrections, and access-status records.',
    canonicalPath: '/workflows/background-check-records',
  },
  intakeVersion: '2.0.0',
  intake: BACKGROUND_CHECK_RECORD_INTAKE,
  capabilities: BACKGROUND_CHECK_RECORD_CAPABILITIES,
  request: { categories: BACKGROUND_CHECK_RECORD_CATEGORIES, build: buildBackgroundCheckRecordsRequest },
  validate: validateBackgroundCheck,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      requireOwnAuthorizedOrOtherwiseLawfulAccessBasis: true,
      doNotBypassConsentOrAuthorizationRequirements: true,
      doNotImpersonateSubjectOrMisstateAuthorization: true,
      doNotRequestPasswordsAuthenticationSecretsOrBiometricTemplates: true,
      doNotRequestClassifiedSecurityClearanceOrProtectedInvestigativeMaterial: true,
      doNotConflateArrestChargeAndConviction: true,
      preserveSourceAndDecisionProvenance: true,
      requestDisclosableRecordsAndSegregablePortionsOnly: true,
    },
  }],
  responseAnalysis: {
    findingTypes: BACKGROUND_CHECK_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('BACKGROUND_CHECK_ANALYSIS_INPUT_INVALID')
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
      const deterministic = analyzeGenericProduction(requested, records, 'background-check record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'background-check-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'background-check-records', policy),
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
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'background-check-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'background-check-records', {
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
