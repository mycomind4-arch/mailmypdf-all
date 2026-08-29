import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const PUBLIC_RECORDS_CATEGORIES = [
  'agency-records','program-records','policy-and-guidance','contracts-and-expenditures','communications','inspections-and-audits','investigation-records','data-and-reports','personnel-records','references-and-cross-indexed',
] as const

export const PUBLIC_RECORDS_INTAKE = [
  { id: 'agency', label: 'Agency / department', required: true, helpText: 'Government agency likely to maintain the records.' },
  { id: 'department', label: 'Specific office / custodian', helpText: 'Particular office, division, or records custodian when known.' },
  { id: 'recordsDescription', label: 'Records sought (description)', required: true, helpText: 'Describe the records with reasonable specificity.' },
  { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
  { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
  { id: 'identifiers', label: 'Identifiers (case #, address, project, name)', helpText: 'Any known identifiers that help locate the records.' },
  { id: 'searchTerms', label: 'Search terms / keywords', helpText: 'Distinctive terms to narrow the search.' },
  { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description of the subject matter.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = textHelper(input, 'identifiers') ? ` Identifiers: ${textHelper(input, 'identifiers')}.` : ''
  const search = textHelper(input, 'searchTerms') ? ` Search terms: ${textHelper(input, 'searchTerms')}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` Subject: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'agency-records': `General agency records, memoranda, decision documents, and internal files.${scope}${search}${dates}`,
    'program-records': `Program-specific records, operational files, and program documentation.${scope}${search}${dates}`,
    'policy-and-guidance': `Policy documents, guidance, directives, manuals, and interpretive materials.${scope}${search}${dates}`,
    'contracts-and-expenditures': `Contracts, procurement records, expenditure documentation, and financial agreements.${scope}${search}${dates}`,
    'communications': `Emails, correspondence, meeting records, and internal communications.${scope}${search}${dates}`,
    'inspections-and-audits': `Inspection reports, audit findings, compliance reviews, and evaluation records.${scope}${search}${dates}`,
    'investigation-records': `Investigation files, inquiry records, and related documentation.${scope}${search}${dates}`,
    'data-and-reports': `Datasets, statistical reports, periodic reports, and analytical products.${scope}${search}${dates}`,
    'personnel-records': `Personnel records, assignments, and role documentation (subject to privacy exemptions).${scope}${search}${dates}`,
    'references-and-cross-indexed': `Records referenced or cross-indexed with the requested materials.${scope}${search}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${search}${dates}`}${subject}`
}

function validatePublicRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('agency')) issues.push({ field: 'agency', message: 'Identify the government agency that likely maintains the records.' })
  if (!descriptions.includes('subject:')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic of the records you are requesting.' })
  return issues
}

export function buildPublicRecordsRequest(input: Record<string, unknown>) {
  const agency = textHelper(input, 'agency') ?? ''
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, PUBLIC_RECORDS_CATEGORIES)
  return {
    title: `Public Records Request — ${subject ?? agency ?? 'Government Records'}`,
    agency,
    jurisdiction: textHelper(input, 'jurisdiction'),
    purpose: textHelper(input, 'purpose') ?? 'Obtain government agency records under applicable public records law.',
    scope: JSON.stringify({ workflow: 'public-records-request', department: textHelper(input, 'department'), identifiers: textHelper(input, 'identifiers'), searchTerms: textHelper(input, 'searchTerms'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end, custodian: textHelper(input, 'department') })),
  }
}

export const publicRecordsRequestWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'public-records-request',
  name: 'Public Records Request',
  description: 'Turn a plain-English objective into a precise request with record categories, date ranges, custodians, identifiers, format requirements, and exclusions.',
  searchIntent: 'public records request',
  seo: { title: 'Public Records Request — How to Request Government Records', description: 'Build a precise public records request with the agency, records sought, dates, custodians, identifiers, formats, and scope needed for a searchable request.', canonicalPath: '/workflows/public-records-request' },
  intakeVersion: '1.0.0',
  intake: PUBLIC_RECORDS_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: PUBLIC_RECORDS_CATEGORIES, build: buildPublicRecordsRequest },
  validate: validatePublicRecords,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PUBLIC_RECORDS_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'public record')
    },
  },
})
