import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const COURT_RECORDS_CATEGORIES = [
  'case-file','docket-entries','filings-and-pleadings','exhibits','transcripts','orders-and-judgments','correspondence','discovery','hearing-records','references-and-cross-indexed',
] as const

export const COURT_RECORDS_INTAKE = [
  { id: 'court', label: 'Court', required: true, helpText: 'Federal, state, or local court likely to hold the records.' },
  { id: 'division', label: 'Division / department', helpText: 'Civil, criminal, family, probate, traffic, or other division.' },
  { id: 'caseNumber', label: 'Case number', helpText: 'Case, docket, or proceeding number when known.' },
  { id: 'parties', label: 'Parties', helpText: 'Plaintiff, defendant, petitioner, respondent, or other party names.' },
  { id: 'dateStart', label: 'Filing / record start date', required: true, helpText: 'Beginning of the relevant filing period.' },
  { id: 'dateEnd', label: 'Filing / record end date', required: true, helpText: 'End of the relevant filing period.' },
  { id: 'caseType', label: 'Case type', helpText: 'Civil, criminal, family, probate, small claims, or other classification.' },
  { id: 'subjectMatter', label: 'Subject / what the case is about', required: true, helpText: 'Plain-English description of the matter.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const court = textHelper(input, 'court') ?? 'the court'
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = textHelper(input, 'caseNumber') ? ` Case number: ${textHelper(input, 'caseNumber')}.` : ''
  const parties = textHelper(input, 'parties') ? ` Parties: ${textHelper(input, 'parties')}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` Matter: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'case-file': `Complete case file, including the master file, index, and all associated records from ${court}.${scope}${parties}${dates}`,
    'docket-entries': `Docket entries, docket sheet, and all dated proceedings and filings.${scope}${parties}${dates}`,
    'filings-and-pleadings': `All filed pleadings, motions, briefs, responses, and supporting documents.${scope}${parties}${dates}`,
    'exhibits': `Exhibits, attachments, and filed supporting materials referenced in the case.${scope}${parties}${dates}`,
    'transcripts': `Hearing transcripts, trial transcripts, and recorded proceedings.${scope}${parties}${dates}`,
    'orders-and-judgments': `Court orders, judgments, rulings, and written decisions.${scope}${parties}${dates}`,
    'correspondence': `Letters, notices, and correspondence filed with or issued by the court.${scope}${parties}${dates}`,
    'discovery': `Discovery materials, interrogatories, depositions, and related filings (subject to applicable access rules).${scope}${parties}${dates}`,
    'hearing-records': `Hearing records, calendars, minutes, and scheduling documentation.${scope}${parties}${dates}`,
    'references-and-cross-indexed': `Records referenced or cross-indexed with the case file.${scope}${parties}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${parties}${dates}`}${subject}`
}

function validateCourtRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('case number') && !descriptions.includes('parties:')) issues.push({ field: 'identifiers', message: 'Provide a case number or party names so the court can identify the case.' })
  if (!descriptions.includes('matter:')) issues.push({ field: 'subjectMatter', message: 'Describe the case or matter in plain language.' })
  return issues
}

export function buildCourtRecordsRequest(input: Record<string, unknown>) {
  const court = textHelper(input, 'court') ?? ''
  const caseNumber = textHelper(input, 'caseNumber')
  const parties = textHelper(input, 'parties')
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, COURT_RECORDS_CATEGORIES)
  return {
    title: `Court Records — ${caseNumber ?? parties ?? subject ?? court}`,
    agency: court,
    jurisdiction: textHelper(input, 'jurisdiction'),
    purpose: textHelper(input, 'purpose') ?? 'Obtain court records, case files, and related materials for the identified proceeding.',
    scope: JSON.stringify({ workflow: 'court-records', division: textHelper(input, 'division'), caseNumber, parties, caseType: textHelper(input, 'caseType'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end, custodian: textHelper(input, 'division') })),
  }
}

export const courtRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'court-records',
  name: 'Court Records Request',
  description: 'Build a focused court records request for case files, dockets, filings, exhibits, transcripts, orders, and related materials.',
  searchIntent: 'how to get court records',
  seo: { title: 'Court Records Request — Case Files, Dockets, Filings & Exhibits', description: 'Build a focused court records request around the court, case number, parties, filing dates, docket entries, filings, exhibits, and other case materials.', canonicalPath: '/workflows/court-records' },
  intakeVersion: '1.0.0',
  intake: COURT_RECORDS_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: COURT_RECORDS_CATEGORIES, build: buildCourtRecordsRequest },
  validate: validateCourtRecords,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('COURT_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'court record')
    },
  },
})
