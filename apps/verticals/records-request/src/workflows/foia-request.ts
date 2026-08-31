import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const FOIA_CATEGORIES = [
  'agency-records','program-records','policy-and-guidance','contracts-and-expenditures','communications','personnel-records','inspection-and-audit','investigation-records','data-and-reports','references-and-cross-indexed',
] as const

export const FOIA_INTAKE = [
  { id: 'agency', label: 'Federal agency', required: true, helpText: 'The federal agency likely to maintain the records.' },
  { id: 'component', label: 'Agency component / office', helpText: 'Specific bureau, office, or sub-component when known.' },
  { id: 'recordsDescription', label: 'Records sought (description)', required: true, helpText: 'Describe the records with reasonable specificity.' },
  { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
  { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
  { id: 'searchTerms', label: 'Search terms / keywords', helpText: 'Distinctive names, project terms, case numbers, or keywords.' },
  { id: 'custodian', label: 'Known custodian', helpText: 'Specific official or office likely to hold the records.' },
  { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description of the subject matter.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const agency = textHelper(input, 'agency') ?? 'the agency'
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = textHelper(input, 'searchTerms') ? ` Search terms: ${textHelper(input, 'searchTerms')}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` Subject matter: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'agency-records': `General agency records, memoranda, decision documents, and internal files related to the subject.${scope}${dates}`,
    'program-records': `Program-specific records, operational files, and documentation maintained by ${agency} programs.${scope}${dates}`,
    'policy-and-guidance': `Policy documents, guidance memoranda, directives, manuals, and interpretive materials.${scope}${dates}`,
    'contracts-and-expenditures': `Contracts, procurement records, expenditure documentation, and financial agreements.${scope}${dates}`,
    'communications': `Emails, correspondence, meeting records, and internal communications.${scope}${dates}`,
    'personnel-records': `Personnel records, assignments, and role documentation relevant to the subject (subject to privacy exemptions).${scope}${dates}`,
    'inspection-and-audit': `Inspection reports, audit findings, compliance reviews, and evaluation records.${scope}${dates}`,
    'investigation-records': `Investigation files, inquiry records, and related documentation.${scope}${dates}`,
    'data-and-reports': `Datasets, statistical reports, periodic reports, and analytical products.${scope}${dates}`,
    'references-and-cross-indexed': `Records referenced or cross-indexed with the requested materials.${scope}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}${dates}`}${subject}`
}

function validateFoia(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('agency')) issues.push({ field: 'agency', message: 'Identify the federal agency that likely maintains the records.' })
  if (!descriptions.includes('subject matter')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic of the records you are requesting.' })
  return issues
}

export function buildFoiaRequest(input: Record<string, unknown>) {
  const agency = textHelper(input, 'agency') ?? ''
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, FOIA_CATEGORIES)
  return {
    title: `FOIA Request — ${subject ?? agency ?? 'Federal Records'}`,
    agency,
    jurisdiction: 'Federal',
    purpose: textHelper(input, 'purpose') ?? 'Obtain federal agency records under the Freedom of Information Act.',
    scope: JSON.stringify({ workflow: 'foia-request', component: textHelper(input, 'component'), searchTerms: textHelper(input, 'searchTerms'), custodian: textHelper(input, 'custodian'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end, custodian: textHelper(input, 'custodian') ?? textHelper(input, 'component') })),
  }
}

export const foiaRequestWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'foia-request',
  name: 'FOIA / Federal Records Request',
  description: 'Build a focused federal FOIA request with agency, records sought, date range, custodians, search terms, and delivery preferences.',
  searchIntent: 'how to file a FOIA request',
  seo: { title: 'FOIA Request — How to File a Federal Records Request', description: 'Build a focused federal FOIA request with agency, records sought, date range, custodians, identifiers, search terms, and delivery preferences.', canonicalPath: '/workflows/foia-request' },
  intakeVersion: '1.0.0',
  intake: FOIA_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: FOIA_CATEGORIES, build: buildFoiaRequest },
  validate: validateFoia,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('FOIA_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'federal record')
    },
  },
})
