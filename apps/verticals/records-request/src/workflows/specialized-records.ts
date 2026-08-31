import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

// ── Military Records ──
export const militaryRecordsWorkflow = createRecordsWorkflow({
  id: 'military-records',
  name: 'Military Records Request',
  description: 'Request military service records, personnel files, discharge papers, and related military records.',
  searchIntent: 'military records request',
  seo: { title: 'Military Records Request — Service Records & DD-214', description: 'Build a military records request for service records, personnel files, discharge papers, and related records.', canonicalPath: '/workflows/military-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency', required: true, helpText: 'NPRC, VA, or relevant military branch records office.' },
    { id: 'veteranName', label: 'Veteran / service member name', required: true, helpText: 'Full name of the veteran or service member.' },
    { id: 'serviceNumber', label: 'Service number', helpText: 'Military service number or SSN (if authorized).' },
    { id: 'branch', label: 'Branch of service', helpText: 'Army, Navy, Air Force, Marines, Coast Guard, Space Force.' },
    { id: 'servicePeriod', label: 'Service period', helpText: 'Dates of service or approximate period.' },
    { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the requested record period.' },
    { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the requested record period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['service-records', 'personnel-file', 'medical-records', 'discharge-papers', 'decorations-and-awards', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'veteranName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['service-records', 'personnel-file', 'medical-records', 'discharge-papers', 'decorations-and-awards', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Military Records — ${name ?? 'Veteran'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: 'Federal',
        purpose: textHelper(input, 'purpose') ?? 'Obtain military service records for the identified veteran.',
        scope: JSON.stringify({ workflow: 'military-records', veteranName: name, serviceNumber: textHelper(input, 'serviceNumber'), branch: textHelper(input, 'branch'), servicePeriod: textHelper(input, 'servicePeriod') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the veteran'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('veteran')) issues.push({ field: 'veteranName', message: 'Provide the veteran or service member name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('MILITARY_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'military record')
    },
  },
})

// ── Medical Records ──
export const medicalRecordsWorkflow = createRecordsWorkflow({
  id: 'medical-records',
  name: 'Medical Records Request',
  description: 'Request medical records, treatment histories, test results, and related health records from a healthcare provider.',
  searchIntent: 'medical records request',
  seo: { title: 'Medical Records Request — Health Records & Test Results', description: 'Build a medical records request for treatment histories, test results, and related health records.', canonicalPath: '/workflows/medical-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Healthcare provider / facility', required: true, helpText: 'Hospital, clinic, or provider maintaining the records.' },
    { id: 'patientName', label: 'Patient name', required: true, helpText: 'Full name of the patient.' },
    { id: 'dateOfBirth', label: 'Date of birth', helpText: 'Patient date of birth.' },
    { id: 'dateStart', label: 'Treatment start date', required: true, helpText: 'Beginning of the treatment period.' },
    { id: 'dateEnd', label: 'Treatment end date', required: true, helpText: 'End of the treatment period.' },
    { id: 'subjectMatter', label: 'Purpose / type of records', required: true, helpText: 'What records you need and why.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['clinical-records', 'lab-and-test-results', 'imaging-records', 'medication-records', 'billing-records', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'patientName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['clinical-records', 'lab-and-test-results', 'imaging-records', 'medication-records', 'billing-records', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Medical Records — ${name ?? 'Patient'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain medical records for the identified patient under HIPAA or applicable law.',
        scope: JSON.stringify({ workflow: 'medical-records', patientName: name, dateOfBirth: textHelper(input, 'dateOfBirth') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the patient'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('patient')) issues.push({ field: 'patientName', message: 'Provide the patient name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('MEDICAL_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'medical record')
    },
  },
})

// ── Employment Records ──
export const employmentRecordsWorkflow = createRecordsWorkflow({
  id: 'employment-records',
  name: 'Employment Records Request',
  description: 'Request employment records, personnel files, payroll, and related employment records from an employer.',
  searchIntent: 'employment records request',
  seo: { title: 'Employment Records Request — Personnel Files & Payroll', description: 'Build an employment records request for personnel files, payroll, and related employment records.', canonicalPath: '/workflows/employment-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Employer / agency', required: true, helpText: 'Employer or agency maintaining the employment records.' },
    { id: 'employeeName', label: 'Employee name', required: true, helpText: 'Full name of the employee.' },
    { id: 'employeeId', label: 'Employee ID', helpText: 'Employee identification number.' },
    { id: 'position', label: 'Position / title', helpText: 'Job title or position held.' },
    { id: 'dateStart', label: 'Employment start date', required: true, helpText: 'Beginning of the employment period.' },
    { id: 'dateEnd', label: 'Employment end date', required: true, helpText: 'End of the employment period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['personnel-file', 'payroll-records', 'performance-evaluations', 'disciplinary-records', 'time-and-attendance', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'employeeName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['personnel-file', 'payroll-records', 'performance-evaluations', 'disciplinary-records', 'time-and-attendance', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Employment Records — ${name ?? 'Employee'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain employment records for the identified employee.',
        scope: JSON.stringify({ workflow: 'employment-records', employeeName: name, employeeId: textHelper(input, 'employeeId'), position: textHelper(input, 'position') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the employee'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('employee')) issues.push({ field: 'employeeName', message: 'Provide the employee name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('EMPLOYMENT_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'employment record')
    },
  },
})

// ── Education / School Records ──
export const educationRecordsWorkflow = createRecordsWorkflow({
  id: 'education-records',
  name: 'Education Records Request',
  description: 'Request education records, transcripts, enrollment history, and related student records from a school or educational institution.',
  searchIntent: 'education records request',
  seo: { title: 'Education Records Request — Transcripts & Student Records', description: 'Build an education records request for transcripts, enrollment history, and related student records.', canonicalPath: '/workflows/education-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'School / institution', required: true, helpText: 'School, college, or educational institution.' },
    { id: 'studentName', label: 'Student name', required: true, helpText: 'Full name of the student.' },
    { id: 'studentId', label: 'Student ID', helpText: 'Student identification number.' },
    { id: 'dateStart', label: 'Enrollment start date', required: true, helpText: 'Beginning of enrollment period.' },
    { id: 'dateEnd', label: 'Enrollment end date', required: true, helpText: 'End of enrollment period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['transcripts', 'enrollment-records', 'attendance-records', 'disciplinary-records', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'studentName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['transcripts', 'enrollment-records', 'attendance-records', 'disciplinary-records', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Education Records — ${name ?? 'Student'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain education records for the identified student under FERPA or applicable law.',
        scope: JSON.stringify({ workflow: 'education-records', studentName: name, studentId: textHelper(input, 'studentId') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the student'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('student')) issues.push({ field: 'studentName', message: 'Provide the student name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('EDUCATION_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'education record')
    },
  },
})

// ── Records Follow-Up Request ──
export const recordsFollowUpWorkflow = createRecordsWorkflow({
  id: 'records-follow-up',
  name: 'Records Follow-Up Request',
  description: 'Follow up on an unanswered, incomplete, or delayed records request with a targeted inquiry about status, missing items, and deadlines.',
  searchIntent: 'records follow up request',
  seo: { title: 'Records Follow-Up Request — Status & Missing Items', description: 'Build a follow-up request for an unanswered, incomplete, or delayed records request.', canonicalPath: '/workflows/records-follow-up' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency', required: true, helpText: 'The agency that received the original request.' },
    { id: 'originalRequestDate', label: 'Original request date', required: true, helpText: 'Date the original request was submitted.' },
    { id: 'originalRequestNumber', label: 'Original request / reference number', helpText: 'Tracking or reference number from the original request.' },
    { id: 'missingCategories', label: 'Missing record categories', helpText: 'Categories from the original request not yet produced.' },
    { id: 'lastContactDate', label: 'Last contact date', helpText: 'Date of last communication from the agency.' },
    { id: 'subjectMatter', label: 'Subject / what you are following up on', required: true, helpText: 'Plain-English description of the follow-up.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['status-inquiry', 'missing-categories', 'deadline-confirmation', 'fee-inquiry', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const origDate = textHelper(input, 'originalRequestDate')
      const selected = categoriesHelper(input, ['status-inquiry', 'missing-categories', 'deadline-confirmation', 'fee-inquiry', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Records Follow-Up — ${subject ?? 'Status Inquiry'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Follow up on an unanswered or incomplete records request.',
        scope: JSON.stringify({ workflow: 'records-follow-up', originalRequestDate: origDate, originalRequestNumber: textHelper(input, 'originalRequestNumber'), missingCategories: textHelper(input, 'missingCategories'), lastContactDate: textHelper(input, 'lastContactDate') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for the original request submitted ${origDate ?? 'on an earlier date'}. ${textHelper(input, 'missingCategories') ? `Missing categories: ${textHelper(input, 'missingCategories')}.` : ''}` })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('original request')) issues.push({ field: 'originalRequestDate', message: 'Provide the date of the original request.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('FOLLOWUP_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'follow-up record')
    },
  },
})

// ── Records Denial / Appeal ──
export const recordsDenialAppealWorkflow = createRecordsWorkflow({
  id: 'records-denial-appeal',
  name: 'Records Denial / Appeal Request',
  description: 'Appeal a records request denial by identifying the denied categories, stated exemption basis, and arguments for disclosure.',
  searchIntent: 'records denial appeal',
  seo: { title: 'Records Denial Appeal — Challenge a Records Denial', description: 'Build an appeal for a records request denial by identifying denied categories, exemption basis, and disclosure arguments.', canonicalPath: '/workflows/records-denial-appeal' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency', required: true, helpText: 'The agency that denied the request.' },
    { id: 'originalRequestDate', label: 'Original request date', required: true, helpText: 'Date the original request was submitted.' },
    { id: 'denialDate', label: 'Denial date', required: true, helpText: 'Date of the denial.' },
    { id: 'denialBasis', label: 'Stated denial / exemption basis', required: true, helpText: 'The legal exemption or reason cited for denial.' },
    { id: 'deniedCategories', label: 'Denied record categories', helpText: 'Categories that were denied.' },
    { id: 'subjectMatter', label: 'Appeal / argument', required: true, helpText: 'Your argument for why the records should be disclosed.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['appeal-letter', 'exemption-analysis', 'prior-request-reference', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const basis = textHelper(input, 'denialBasis')
      const selected = categoriesHelper(input, ['appeal-letter', 'exemption-analysis', 'prior-request-reference', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Records Appeal — ${subject ?? 'Denial Appeal'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Appeal a records request denial.',
        scope: JSON.stringify({ workflow: 'records-denial-appeal', originalRequestDate: textHelper(input, 'originalRequestDate'), denialDate: textHelper(input, 'denialDate'), denialBasis: basis, deniedCategories: textHelper(input, 'deniedCategories') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} regarding the denial dated ${textHelper(input, 'denialDate') ?? 'an earlier date'}. Stated basis: ${basis ?? 'not specified'}. Argument: ${subject ?? 'disclosure is warranted under applicable law.'}` })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('denial')) issues.push({ field: 'denialDate', message: 'Provide the denial date.' })
    if (!d.includes('basis')) issues.push({ field: 'denialBasis', message: 'Provide the stated exemption or reason for denial.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('DENIAL_APPEAL_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'appeal record')
    },
  },
})
