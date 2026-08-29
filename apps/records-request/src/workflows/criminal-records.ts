import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

// ── Criminal Records ──
export const CRIMINAL_RECORDS_CATEGORIES = [
  'case-file','charges-and-indictments','court-records','sentencing-records','probation-and-parole','correspondence','evidence-and-exhibits','hearing-records','references-and-cross-indexed','index-and-search-records',
] as const
export const criminalRecordsWorkflow = createRecordsWorkflow({
  id: 'criminal-records',
  name: 'Criminal Records Request',
  description: 'Request criminal case files, charges, court records, sentencing, probation, and related records for a specific case or person.',
  searchIntent: 'criminal records request',
  seo: { title: 'Criminal Records Request — Case Files, Charges & Court Records', description: 'Build a criminal records request for case files, charges, court records, sentencing, and related records.', canonicalPath: '/workflows/criminal-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Court / agency', required: true, helpText: 'Court, prosecutor, or law enforcement agency.' },
    { id: 'personName', label: 'Person name', helpText: 'Full name of the person.' },
    { id: 'caseNumber', label: 'Case number', helpText: 'Case, docket, or file number.' },
    { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the relevant period.' },
    { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the relevant period.' },
    { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'City, county, state, or federal.' },
    { id: 'subjectMatter', label: 'Subject / case description', required: true, helpText: 'Plain-English description of the case or records sought.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: CRIMINAL_RECORDS_CATEGORIES,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const caseNum = textHelper(input, 'caseNumber')
      const subject = textHelper(input, 'subjectMatter')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, CRIMINAL_RECORDS_CATEGORIES)
      return {
        title: `Criminal Records — ${caseNum ?? name ?? subject ?? 'Case'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain criminal case records for the identified person or case.',
        scope: JSON.stringify({ workflow: 'criminal-records', personName: name, caseNumber: caseNum, subjectMatter: subject }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ? name : 'the case'}${caseNum ? ` (case #${caseNum})` : ''}. Subject: ${subject ?? 'criminal records'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('case') && !d.includes('person')) issues.push({ field: 'identifiers', message: 'Provide a case number or person name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('CRIMINAL_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'criminal record')
    },
  },
})

// ── Criminal History ──
export const criminalHistoryWorkflow = createRecordsWorkflow({
  id: 'criminal-history',
  name: 'Criminal History Request',
  description: 'Request criminal history records, rap sheets, background information, and related records from the appropriate agency.',
  searchIntent: 'criminal history request',
  seo: { title: 'Criminal History Request — Rap Sheets & Background Records', description: 'Build a criminal history request for rap sheets, background records, and related records.', canonicalPath: '/workflows/criminal-history' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency', required: true, helpText: 'State police, DOJ, FBI, or other criminal history repository.' },
    { id: 'personName', label: 'Person name', required: true, helpText: 'Full legal name.' },
    { id: 'dateOfBirth', label: 'Date of birth', helpText: 'DOB or approximate date.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['history-records', 'arrest-records', 'conviction-records', 'disposition-records', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['history-records', 'arrest-records', 'conviction-records', 'disposition-records', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Criminal History — ${name ?? 'Person'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain criminal history records for the identified person.',
        scope: JSON.stringify({ workflow: 'criminal-history', personName: name, dateOfBirth: textHelper(input, 'dateOfBirth') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the person'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('person')) issues.push({ field: 'personName', message: 'Provide the person name for the criminal history search.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('CRIMINAL_HISTORY_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'criminal history record')
    },
  },
})

// ── Arrest Records ──
export const arrestRecordsWorkflow = createRecordsWorkflow({
  id: 'arrest-records',
  name: 'Arrest Records Request',
  description: 'Request arrest records, booking records, charging documents, and related law enforcement records.',
  searchIntent: 'arrest records request',
  seo: { title: 'Arrest Records Request — Booking & Arrest Records', description: 'Build an arrest records request for booking records, charging documents, and related law enforcement records.', canonicalPath: '/workflows/arrest-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Law enforcement agency', required: true, helpText: 'Police, sheriff, or corrections agency.' },
    { id: 'personName', label: 'Person name', helpText: 'Full name of the arrested person.' },
    { id: 'arrestNumber', label: 'Arrest / booking number', helpText: 'Booking or arrest number.' },
    { id: 'arrestDate', label: 'Arrest date', helpText: 'Date or approximate date of arrest.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Subject / incident', required: true, helpText: 'Description of the arrest or incident.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['arrest-reports', 'booking-records', 'charging-documents', 'mugshots-and-photographs', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const num = textHelper(input, 'arrestNumber')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['arrest-reports', 'booking-records', 'charging-documents', 'mugshots-and-photographs', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Arrest Records — ${num ?? name ?? 'Arrest'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain arrest and booking records for the identified person or incident.',
        scope: JSON.stringify({ workflow: 'arrest-records', personName: name, arrestNumber: num, arrestDate: textHelper(input, 'arrestDate') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ? name : 'the arrest'}${num ? ` (booking #${num})` : ''}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('arrest') && !d.includes('booking') && !d.includes('person')) issues.push({ field: 'identifiers', message: 'Provide a person name or booking number.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('ARREST_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'arrest record')
    },
  },
})

// ── Background Check Records ──
export const backgroundCheckRecordsWorkflow = createRecordsWorkflow({
  id: 'background-check-records',
  name: 'Background Check Records Request',
  description: 'Request background check records, screening reports, and related records from the agency that conducted or maintains the check.',
  searchIntent: 'background check records request',
  seo: { title: 'Background Check Records Request', description: 'Build a background check records request for screening reports and related records.', canonicalPath: '/workflows/background-check-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency', required: true, helpText: 'Agency that conducted or maintains the background check.' },
    { id: 'personName', label: 'Person name', required: true, helpText: 'Full name of the person screened.' },
    { id: 'dateOfBirth', label: 'Date of birth', helpText: 'DOB of the person.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['background-check-report', 'criminal-history-check', 'employment-verification', 'education-verification', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['background-check-report', 'criminal-history-check', 'employment-verification', 'education-verification', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Background Check Records — ${name ?? 'Person'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain background check records for the identified person.',
        scope: JSON.stringify({ workflow: 'background-check-records', personName: name, dateOfBirth: textHelper(input, 'dateOfBirth') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the person'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('person')) issues.push({ field: 'personName', message: 'Provide the person name for the background check.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('BACKGROUND_CHECK_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'background check record')
    },
  },
})
