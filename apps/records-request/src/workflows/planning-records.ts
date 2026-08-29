import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const PLANNING_RECORDS_CATEGORIES = [
  'planning-applications','zoning-records','staff-reports','site-plans','planning-communications','public-notices','planning-commission','conditions-of-approval','environmental-review','related-permits',
] as const

export const PLANNING_RECORDS_INTAKE = [
  { id: 'agency', label: 'Planning agency / jurisdiction', required: true, helpText: 'City, county, or regional planning department.' },
  { id: 'address', label: 'Property address', helpText: 'Street address or site identifier.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Parcel or assessor identifier.' },
  { id: 'projectNumber', label: 'Project / application number', helpText: 'Planning application or project number.' },
  { id: 'projectName', label: 'Project name', helpText: 'Known project or development name.' },
  { id: 'applicant', label: 'Applicant / developer', helpText: 'Applicant, developer, or property owner.' },
  { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
  { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
  { id: 'subjectMatter', label: 'Project / subject matter', required: true, helpText: 'Plain-English description of the development or planning matter.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = [textHelper(input, 'projectNumber') && `project number ${textHelper(input, 'projectNumber')}`, textHelper(input, 'address') && `property address ${textHelper(input, 'address')}`, textHelper(input, 'parcelNumber') && `parcel/APN ${textHelper(input, 'parcelNumber')}`, textHelper(input, 'applicant') && `applicant ${textHelper(input, 'applicant')}`].filter(Boolean).join('; ')
  const scopeText = scope ? ` Search using these identifiers: ${scope}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` The project concerns: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'planning-applications': `Planning applications, intake records, submittals, and application metadata.${scopeText}${dates}`,
    'zoning-records': `Zoning records, land-use designations, rezoning files, and variance records.${scopeText}${dates}`,
    'staff-reports': `Staff reports, analyses, memoranda, and planning department recommendations.${scopeText}${dates}`,
    'site-plans': `Site plans, plot plans, development plans, and related submitted exhibits.${scopeText}${dates}`,
    'planning-communications': `Planning department communications, emails, letters, and meeting notes.${scopeText}${dates}`,
    'public-notices': `Notices, hearing materials, mailed notices, and published announcements.${scopeText}${dates}`,
    'planning-commission': `Planning commission records, resolutions, minutes, agendas, and hearing records.${scopeText}${dates}`,
    'conditions-of-approval': `Conditions of approval, resolutions, and related decision documents.${scopeText}${dates}`,
    'environmental-review': `Environmental review records, EIR/EA documents, and related environmental findings.${scopeText}${dates}`,
    'related-permits': `Related permits and cross-referenced records tied to the project.${scopeText}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scopeText}${dates}`}${subject}`
}

function validatePlanningRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('project number') && !descriptions.includes('property address') && !descriptions.includes('parcel/apn')) issues.push({ field: 'identifiers', message: 'Provide a project number, address, or parcel/APN so the planning agency can identify the project.' })
  if (!descriptions.includes('project concerns')) issues.push({ field: 'subjectMatter', message: 'Describe the development or planning matter.' })
  return issues
}

export function buildPlanningRecordsRequest(input: Record<string, unknown>) {
  const projectName = textHelper(input, 'projectName')
  const projectNumber = textHelper(input, 'projectNumber')
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, PLANNING_RECORDS_CATEGORIES)
  return {
    title: `Planning Records — ${projectNumber ?? projectName ?? subject ?? 'Project'}`,
    agency: textHelper(input, 'agency') ?? '',
    jurisdiction: textHelper(input, 'jurisdiction'),
    purpose: textHelper(input, 'purpose') ?? 'Obtain planning, zoning, development, and related records for the identified project or property.',
    scope: JSON.stringify({ workflow: 'planning-records', projectNumber, projectName, address: textHelper(input, 'address'), parcelNumber: textHelper(input, 'parcelNumber'), applicant: textHelper(input, 'applicant'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end })),
  }
}

export const planningRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'planning-records',
  name: 'Planning & Development Records Request',
  description: 'Request planning applications, staff reports, zoning materials, development correspondence, meeting records, and related agency files.',
  searchIntent: 'planning records request',
  seo: { title: 'Planning Records Request — Zoning, Development Applications & Staff Reports', description: 'Build a focused planning and development records request for zoning files, applications, staff reports, correspondence, meeting materials, permits, and project records.', canonicalPath: '/workflows/planning-records' },
  intakeVersion: '1.0.0',
  intake: PLANNING_RECORDS_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: PLANNING_RECORDS_CATEGORIES, build: buildPlanningRecordsRequest },
  validate: validatePlanningRecords,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PLANNING_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'planning record')
    },
  },
})
