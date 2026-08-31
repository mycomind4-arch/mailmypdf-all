import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const CASE_RECORDS_CATEGORIES = [
  'case-file','violations-and-citations','complaints-and-referrals','investigation-records','correspondence','evidence-and-exhibits','photographs-and-video','permits-and-related-records','hearing-and-conference-records','references-and-cross-indexed',
] as const

export const CASE_RECORDS_INTAKE = [
  { id: 'agency', label: 'Agency / department', required: true, helpText: 'The agency handling the case.' },
  { id: 'caseNumber', label: 'Case number', helpText: 'Case, file, or reference number when known.' },
  { id: 'personName', label: 'Person / entity involved', helpText: 'Person, business, or entity associated with the case.' },
  { id: 'address', label: 'Property / address', helpText: 'Property address or location related to the case.' },
  { id: 'dateStart', label: 'Case start date', required: true, helpText: 'Beginning of the relevant case period.' },
  { id: 'dateEnd', label: 'Case end date', required: true, helpText: 'End of the relevant case period.' },
  { id: 'departments', label: 'Other departments involved', helpText: 'Cross-referenced departments or agencies.' },
  { id: 'subjectMatter', label: 'Case / subject matter', required: true, helpText: 'Plain-English description of the case and what happened.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = [textHelper(input, 'caseNumber') && `case number ${textHelper(input, 'caseNumber')}`, textHelper(input, 'personName') && `person/entity ${textHelper(input, 'personName')}`, textHelper(input, 'address') && `property address ${textHelper(input, 'address')}`].filter(Boolean).join('; ')
  const scopeText = scope ? ` Search using these identifiers: ${scope}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` The case concerns: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'case-file': `Master case file, index, and all associated records.${scopeText}${dates}`,
    'violations-and-citations': `Violations, citations, and enforcement records tied to the case.${scopeText}${dates}`,
    'complaints-and-referrals': `Original complaints, referrals, and intake records that initiated the case.${scopeText}${dates}`,
    'investigation-records': `Investigation files, inquiry records, and related documentation.${scopeText}${dates}`,
    'correspondence': `Correspondence, emails, letters, and communications about the case.${scopeText}${dates}`,
    'evidence-and-exhibits': `Evidence, exhibits, and filed supporting materials.${scopeText}${dates}`,
    'photographs-and-video': `Photographs, video, and related media.${scopeText}${dates}`,
    'permits-and-related-records': `Permits and related records referenced in the case file.${scopeText}${dates}`,
    'hearing-and-conference-records': `Hearing records, conference notes, and meeting minutes.${scopeText}${dates}`,
    'references-and-cross-indexed': `Records referenced or cross-indexed with the case file.${scopeText}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scopeText}${dates}`}${subject}`
}

function validateCaseRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('case number') && !descriptions.includes('person/entity') && !descriptions.includes('property address')) issues.push({ field: 'identifiers', message: 'Provide a case number, person/entity name, or property address so the agency can identify the case.' })
  if (!descriptions.includes('case concerns')) issues.push({ field: 'subjectMatter', message: 'Describe the case or matter in plain language.' })
  return issues
}

export function buildCaseRecordsRequest(input: Record<string, unknown>) {
  const caseNumber = textHelper(input, 'caseNumber')
  const personName = textHelper(input, 'personName')
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, CASE_RECORDS_CATEGORIES)
  return {
    title: `Case Records — ${caseNumber ?? personName ?? subject ?? 'Case'}`,
    agency: textHelper(input, 'agency') ?? '',
    jurisdiction: textHelper(input, 'jurisdiction'),
    purpose: textHelper(input, 'purpose') ?? 'Obtain case-related records from the agency for the identified matter.',
    scope: JSON.stringify({ workflow: 'case-records', caseNumber, personName, address: textHelper(input, 'address'), departments: textHelper(input, 'departments'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end })),
  }
}

export const caseRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'case-records',
  name: 'Case Records Request',
  description: 'Build a case-centered request that connects names, addresses, case numbers, dates, departments, and referenced documents into one coherent records scope.',
  searchIntent: 'records about a specific case',
  seo: { title: 'Case Records Request — Build a Complete Government Case File Search', description: 'Build a case-centered public records request using case numbers, people, properties, departments, dates, related documents, and referenced records.', canonicalPath: '/workflows/case-records' },
  intakeVersion: '1.0.0',
  intake: CASE_RECORDS_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: CASE_RECORDS_CATEGORIES, build: buildCaseRecordsRequest },
  validate: validateCaseRecords,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('CASE_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'case record')
    },
  },
})
