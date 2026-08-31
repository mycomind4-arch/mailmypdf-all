import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

export const PROPERTY_RECORDS_CATEGORIES = [
  'assessor-records','recorder-documents','ownership-history','deeds-and-conveyances','liens-and-encumbrances','maps-and-surveys','valuation-records','tax-records','permits-and-code','references-and-cross-indexed',
] as const

export const PROPERTY_RECORDS_INTAKE = [
  { id: 'agency', label: 'County / agency', required: true, helpText: 'County assessor, recorder, clerk, or other property records custodian.' },
  { id: 'address', label: 'Property address', helpText: 'Street address or site identifier.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Assessor parcel number, APN, or property ID.' },
  { id: 'owner', label: 'Owner / grantor / grantee', helpText: 'Current or prior owner name.' },
  { id: 'documentNumber', label: 'Document / instrument number', helpText: 'Recording or instrument number when known.' },
  { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
  { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
  { id: 'subjectMatter', label: 'Subject / purpose', required: true, helpText: 'Plain-English description of the property or research purpose.' },
] as const

function describe(category: string, input: Record<string, unknown>): string {
  const dates = textHelper(input, 'dateStart') && textHelper(input, 'dateEnd') ? ` Cover ${textHelper(input, 'dateStart')} through ${textHelper(input, 'dateEnd')}.` : ''
  const scope = [textHelper(input, 'address') && `property address ${textHelper(input, 'address')}`, textHelper(input, 'parcelNumber') && `parcel/APN ${textHelper(input, 'parcelNumber')}`, textHelper(input, 'owner') && `owner ${textHelper(input, 'owner')}`, textHelper(input, 'documentNumber') && `document number ${textHelper(input, 'documentNumber')}`].filter(Boolean).join('; ')
  const scopeText = scope ? ` Search using these identifiers: ${scope}.` : ''
  const subject = textHelper(input, 'subjectMatter') ? ` Purpose: ${textHelper(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'assessor-records': `Assessor records, property characteristics, assessments, and related assessor files.${scopeText}${dates}`,
    'recorder-documents': `Recorded documents, deeds, liens, releases, and other recorded instruments.${scopeText}${dates}`,
    'ownership-history': `Ownership history, chain of title, and prior transfer records.${scopeText}${dates}`,
    'deeds-and-conveyances': `Deeds, conveyances, grant deeds, quitclaim deeds, and transfer documents.${scopeText}${dates}`,
    'liens-and-encumbrances': `Liens, encumbrances, judgments, UCC filings, and other recorded claims.${scopeText}${dates}`,
    'maps-and-surveys': `Maps, surveys, plats, parcel maps, and related geographic records.${scopeText}${dates}`,
    'valuation-records': `Valuation records, assessment appeals, appraisals, and related valuation documents.${scopeText}${dates}`,
    'tax-records': `Property tax records, payment history, delinquency records, and related tax files.${scopeText}${dates}`,
    'permits-and-code': `Permits, code enforcement, and building records associated with the property.${scopeText}${dates}`,
    'references-and-cross-indexed': `Records referenced or cross-indexed with the property file.${scopeText}${dates}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scopeText}${dates}`}${subject}`
}

function validatePropertyRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const descriptions = request.items.map(item => item.description.toLowerCase()).join(' ')
  if (!descriptions.includes('property address') && !descriptions.includes('parcel/apn') && !descriptions.includes('document number')) issues.push({ field: 'identifiers', message: 'Provide a property address, parcel/APN, or document number so the custodian can identify the right property.' })
  if (!descriptions.includes('purpose:')) issues.push({ field: 'subjectMatter', message: 'Describe the property or research purpose.' })
  return issues
}

export function buildPropertyRecordsRequest(input: Record<string, unknown>) {
  const address = textHelper(input, 'address')
  const parcelNumber = textHelper(input, 'parcelNumber')
  const subject = textHelper(input, 'subjectMatter')
  const start = textHelper(input, 'dateStart')
  const end = textHelper(input, 'dateEnd')
  const selected = categoriesHelper(input, PROPERTY_RECORDS_CATEGORIES)
  return {
    title: `Property Records — ${address ?? parcelNumber ?? subject ?? 'Property'}`,
    agency: textHelper(input, 'agency') ?? '',
    jurisdiction: textHelper(input, 'jurisdiction'),
    purpose: textHelper(input, 'purpose') ?? 'Obtain property records, ownership history, and related documents for the identified property.',
    scope: JSON.stringify({ workflow: 'property-records', address, parcelNumber, owner: textHelper(input, 'owner'), documentNumber: textHelper(input, 'documentNumber'), dateStart: start, dateEnd: end, subjectMatter: subject }),
    items: selected.map(category => ({ category, description: describe(category, input), dateStart: start, dateEnd: end })),
  }
}

export const propertyRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'property-records',
  name: 'Property & Parcel Records Request',
  description: 'Build a targeted request for property, parcel, assessor, recorder, ownership, and related public records tied to a property or parcel.',
  searchIntent: 'request property records',
  seo: { title: 'Property Records Request — Parcel, Ownership & Property Files', description: 'Build a property records request using an address, APN or parcel number, owner, legal description, document number, and date range.', canonicalPath: '/workflows/property-records' },
  intakeVersion: '1.0.0',
  intake: PROPERTY_RECORDS_INTAKE,
  capabilities: FULL_CAPABILITIES,
  request: { categories: PROPERTY_RECORDS_CATEGORIES, build: buildPropertyRecordsRequest },
  validate: validatePropertyRecords,
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PROPERTY_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      const requested = (source.requestedItems ?? []).map(item => ({ id: item.category, label: item.category, keywords: item.description.split(/\W+/).filter(Boolean).slice(0, 16) }))
      return analyzeGenericProduction(requested, source.records ?? [], 'property record')
    },
  },
})
