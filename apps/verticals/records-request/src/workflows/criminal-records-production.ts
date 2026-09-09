import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import {
  analyzeGenericProduction,
  type GenericProductionRecord,
} from './generic-records-analysis'
import {
  assessGenericRecordContradiction,
  classifyGenericRecord,
  extractGenericRecordFacts,
  recommendGenericRecordFollowUp,
} from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const CRIMINAL_RECORD_CATEGORIES = [
  'docket-register-and-case-index',
  'complaint-information-indictment-and-charging-records',
  'warrants-orders-and-judicial-authorizations',
  'motions-briefs-and-filed-case-documents',
  'hearing-minute-transcript-and-calendar-records',
  'judgment-sentencing-and-disposition-records',
  'post-judgment-supervision-and-compliance-records',
  'exhibit-evidence-and-attachment-indexes',
  'notice-service-and-case-correspondence-records',
  'sealing-expungement-access-and-withholding-records',
] as const

export const CRIMINAL_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const CRIMINAL_RECORD_INTAKE = [
  { id: 'agency', label: 'Court / agency', required: true, helpText: 'Court clerk, prosecutor, corrections/supervision agency, or other lawful records custodian.' },
  { id: 'caseNumber', label: 'Case / docket number', helpText: 'Criminal case, docket, indictment, complaint, or file number when known.' },
  { id: 'personName', label: 'Person / defendant name', helpText: 'Full name or other identifier associated with the case.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant case-record period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant case-record period.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'Court, city, county, state, federal district, or other jurisdiction.' },
  { id: 'courtName', label: 'Court / division', helpText: 'Court, branch, division, department, judge, or clerk office when known.' },
  { id: 'prosecutingAgency', label: 'Prosecuting agency', helpText: 'District attorney, attorney general, U.S. Attorney, city attorney, or other prosecutor when relevant.' },
  { id: 'subjectMatter', label: 'Case / records description', required: true, helpText: 'Plain-English description of the criminal case or records sought.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...CRIMINAL_RECORD_CATEGORIES]
  const known = new Set(CRIMINAL_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof CRIMINAL_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...CRIMINAL_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const ids = [
    text(input, 'caseNumber') && `case/docket number ${text(input, 'caseNumber')}`,
    text(input, 'personName') && `person/defendant ${text(input, 'personName')}`,
    text(input, 'courtName') && `court/division ${text(input, 'courtName')}`,
    text(input, 'prosecutingAgency') && `prosecuting agency ${text(input, 'prosecutingAgency')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${ids.length ? ` Search using: ${ids.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Case/records description: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'docket-register-and-case-index': `Docket sheets, registers of actions, case indexes, filing/event lists, document indexes, case metadata, status history, hearing calendars, and structured records sufficient to identify filings, orders, hearings, disposition, and access status for the identified case.${scope}`,
    'complaint-information-indictment-and-charging-records': `Criminal complaints, informations, indictments, charging instruments, amended or superseding charging documents, filed probable-cause statements associated with charging, and records sufficient to identify charges and amendments in the identified case, to the extent lawfully accessible.${scope}`,
    'warrants-orders-and-judicial-authorizations': `Publicly accessible warrants, summonses, bench warrants, arrest-warrant returns, judicial orders, protective orders, release orders, remand orders, and other judicial authorizations or orders filed in the case, excluding sealed or otherwise access-restricted material unless lawful access exists.${scope}`,
    'motions-briefs-and-filed-case-documents': `Filed motions, oppositions, replies, briefs, memoranda, stipulations, declarations, notices, applications, responses, and other publicly accessible filed case documents associated with the identified matter.${scope}`,
    'hearing-minute-transcript-and-calendar-records': `Minute orders, hearing minutes, proceeding records, calendar entries, transcript indexes, transcript-order records, reporter information, and publicly accessible transcripts or recordings where maintained and lawfully available.${scope}`,
    'judgment-sentencing-and-disposition-records': `Judgments, sentencing orders, minute orders, plea/disposition records, verdict records, dismissal records, conviction/acquittal disposition records, restitution orders, fines/fees orders, and records sufficient to identify final case disposition.${scope}`,
    'post-judgment-supervision-and-compliance-records': `Publicly accessible post-judgment probation, supervision, compliance, violation, revocation, modification, discharge, or completion orders and docket records associated with the identified case; do not request protected treatment, medical, or confidential supervision information.${scope}`,
    'exhibit-evidence-and-attachment-indexes': `Exhibit lists, evidence indexes, attachment indexes, admitted-exhibit logs, lodged-document indexes, media/exhibit references, and records sufficient to identify exhibits or attachments associated with public proceedings, without assuming physical or digital evidence itself is publicly releasable.${scope}`,
    'notice-service-and-case-correspondence-records': `Filed notices, proofs of service, service records, clerk notices, hearing notices, disposition notices, public correspondence filed in the case, and records sufficient to identify formal notification and service events.${scope}`,
    'sealing-expungement-access-and-withholding-records': `Docket entries and publicly disclosable orders or records concerning sealing, expungement, dismissal/set-aside, access restriction, unsealing, redaction, withholding, or restricted-file status; if material is unavailable, request only the lawful public status and basis and do not attempt to circumvent a sealing or access order.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validateCriminalRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the case-record period.' })
  if (!corpus.includes('case/records description:')) issues.push({ field: 'subjectMatter', message: 'Describe the criminal case or records sought.' })
  if (!corpus.includes('case/docket number') && !corpus.includes('person/defendant ')) {
    issues.push({ field: 'identifiers', message: 'Provide a case/docket number or person/defendant name.' })
  }
  return issues
}

export function buildCriminalRecordsRequest(input: Record<string, unknown>) {
  const caseNumber = text(input, 'caseNumber')
  const personName = text(input, 'personName')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Criminal Records — ${caseNumber ?? personName ?? 'Case'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, preserve, obtain, and compare lawfully accessible criminal-case docket, charging, filed-document, hearing, judgment/disposition, exhibit-index, service, access-status, and withholding records for the specified case or person.',
    scope: JSON.stringify({
      workflow: 'criminal-records',
      caseNumber,
      personName,
      dateStart: start,
      dateEnd: end,
      jurisdiction: text(input, 'jurisdiction'),
      courtName: text(input, 'courtName'),
      prosecutingAgency: text(input, 'prosecutingAgency'),
      subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'courtName') ?? text(input, 'prosecutingAgency'),
      systemHint:
        category === 'docket-register-and-case-index' || category === 'sealing-expungement-access-and-withholding-records'
          ? 'court case-management / docket system'
          : category === 'hearing-minute-transcript-and-calendar-records'
            ? 'court calendar / minute / reporter records system'
            : undefined,
      format: category === 'docket-register-and-case-index'
        ? 'native docket export, CSV, JSON, spreadsheet, or other structured format where maintained'
        : undefined,
    })),
  }
}

export const CRIMINAL_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH',
  'DATE_GAP', 'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionCriminalRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'criminal-records',
  name: 'Criminal Records Request',
  description: 'Build a case-specific request for criminal docket/index records, charging documents, public warrants/orders, filed motions, hearing/minute records, judgment/sentencing/disposition, post-judgment public records, exhibit indexes, service notices, and sealing/access-status records.',
  searchIntent: 'criminal records request',
  seo: {
    title: 'Criminal Records Request — Case Files, Charges, Docket & Disposition',
    description: 'Request lawfully accessible criminal case dockets, charging documents, filed motions, hearing records, judgments, sentencing/disposition records, exhibit indexes, and sealing/access-status records.',
    canonicalPath: '/workflows/criminal-records',
  },
  intakeVersion: '2.0.0',
  intake: CRIMINAL_RECORD_INTAKE,
  capabilities: CRIMINAL_RECORD_CAPABILITIES,
  request: { categories: CRIMINAL_RECORD_CATEGORIES, build: buildCriminalRecordsRequest },
  validate: validateCriminalRecords,
  policies: [{
    jurisdiction: 'all',
    version: '2.0.0',
    rules: {
      doNotCircumventSealedExpungedOrRestrictedRecords: true,
      requestOnlyLawfullyAccessibleRecordsAndPublicStatus: true,
      requestStructuredDocketIndexWhereMaintained: true,
      doNotAssumeEvidenceOrExhibitsArePubliclyReleasable: true,
      doNotRequestProtectedTreatmentMedicalOrConfidentialSupervisionInformation: true,
      requestDisclosableRecordsAndSegregablePortions: true,
      preserveCaseIdentifiersAndDocketTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: CRIMINAL_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('CRIMINAL_PRODUCTION_ANALYSIS_INPUT_INVALID')
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
      const deterministic = analyzeGenericProduction(requested, records, 'criminal-case record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'criminal-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'criminal-records', policy),
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
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'criminal-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'criminal-records', {
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
