import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

// ── Police Report Request ──
export const policeReportWorkflow = createRecordsWorkflow({
  id: 'police-report',
  name: 'Police Report Request',
  description: 'Request a specific police or incident report by report number, date, location, and involved parties.',
  searchIntent: 'police report request',
  seo: { title: 'Police Report Request — Get a Copy of an Incident Report', description: 'Build a police report request to get a copy of an incident report by report number, date, location, and involved parties.', canonicalPath: '/workflows/police-report' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Law enforcement agency', required: true, helpText: 'Police or sheriff department that took the report.' },
    { id: 'reportNumber', label: 'Report / incident number', helpText: 'Report, incident, or DR number.' },
    { id: 'incidentDate', label: 'Incident date', required: true, helpText: 'Date the incident occurred.' },
    { id: 'location', label: 'Incident location', helpText: 'Address or location of the incident.' },
    { id: 'personName', label: 'Person involved', helpText: 'Name of a person named in the report.' },
    { id: 'reportType', label: 'Report type', helpText: 'Traffic, accident, incident, supplemental, etc.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Subject / what happened', required: true, helpText: 'Brief description of the incident.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['incident-report', 'supplemental-report', 'accident-report', 'witness-statements', 'photographs-and-video', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const num = textHelper(input, 'reportNumber')
      const name = textHelper(input, 'personName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['incident-report', 'supplemental-report', 'accident-report', 'witness-statements', 'photographs-and-video', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Police Report — ${num ?? name ?? 'Incident'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain a copy of a specific police report.',
        scope: JSON.stringify({ workflow: 'police-report', reportNumber: num, incidentDate: textHelper(input, 'incidentDate'), location: textHelper(input, 'location'), personName: name, reportType: textHelper(input, 'reportType') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for the incident on ${textHelper(input, 'incidentDate') ?? 'the reported date'}${num ? ` (report #${num})` : ''}${name ? ` involving ${name}` : ''}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('incident') && !d.includes('report')) issues.push({ field: 'incidentDate', message: 'Provide the incident date.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('POLICE_REPORT_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'police report')
    },
  },
})

// ── Police Report Copy Request ──
export const policeReportCopyWorkflow = createRecordsWorkflow({
  id: 'police-report-copy',
  name: 'Police Report Copy Request',
  description: 'Request a certified or duplicate copy of a police report, including fees, format, and delivery preferences.',
  searchIntent: 'police report copy request',
  seo: { title: 'Police Report Copy Request — Get a Duplicate or Certified Copy', description: 'Build a request for a duplicate or certified copy of a police report with fee, format, and delivery preferences.', canonicalPath: '/workflows/police-report-copy' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Records division', required: true, helpText: 'Police records division or department.' },
    { id: 'reportNumber', label: 'Report number', required: true, helpText: 'Report, incident, or DR number.' },
    { id: 'requesterName', label: 'Requester name', required: true, helpText: 'Your full name.' },
    { id: 'requesterRelationship', label: 'Relationship to case', helpText: 'Involved party, attorney, insurance, etc.' },
    { id: 'format', label: 'Format preference', helpText: 'Paper, digital, certified, etc.' },
    { id: 'dateStart', label: 'Report date', required: true, helpText: 'Date of the report.' },
    { id: 'dateEnd', label: 'End date', required: true, helpText: 'End of search range.' },
    { id: 'subjectMatter', label: 'Subject / reason', required: true, helpText: 'Why you need the copy.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['report-copy', 'certified-copy', 'fee-schedule', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const num = textHelper(input, 'reportNumber')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['report-copy', 'certified-copy', 'fee-schedule', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Police Report Copy — ${num ?? 'Report'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain a copy of a specific police report.',
        scope: JSON.stringify({ workflow: 'police-report-copy', reportNumber: num, requesterName: textHelper(input, 'requesterName'), requesterRelationship: textHelper(input, 'requesterRelationship'), format: textHelper(input, 'format') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} of report #${num ?? 'the requested report'} for ${textHelper(input, 'requesterName') ?? 'the requester'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('report #')) issues.push({ field: 'reportNumber', message: 'Provide the report number.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('POLICE_REPORT_COPY_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'report copy')
    },
  },
})

// ── Public Information Request ──
export const publicInformationRequestWorkflow = createRecordsWorkflow({
  id: 'public-information-request',
  name: 'Public Information Request',
  description: 'Request public information and government records under applicable public information laws.',
  searchIntent: 'public information request',
  seo: { title: 'Public Information Request — Government Records & Information', description: 'Build a public information request for government records and information under applicable public information laws.', canonicalPath: '/workflows/public-information-request' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Government agency', required: true, helpText: 'Agency likely to hold the information.' },
    { id: 'department', label: 'Department / office', helpText: 'Specific office or division.' },
    { id: 'recordsDescription', label: 'Information sought', required: true, helpText: 'Describe the information with reasonable specificity.' },
    { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the record period.' },
    { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the record period.' },
    { id: 'identifiers', label: 'Identifiers (names, project, address)', helpText: 'Any identifiers to help locate the information.' },
    { id: 'searchTerms', label: 'Search terms', helpText: 'Keywords to narrow the search.' },
    { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description of the topic.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['agency-records', 'program-records', 'reports-and-data', 'communications', 'policy-and-guidance', 'contracts-and-expenditures', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['agency-records', 'program-records', 'reports-and-data', 'communications', 'policy-and-guidance', 'contracts-and-expenditures', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Public Information Request — ${subject ?? 'Government Information'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain public information under applicable public information law.',
        scope: JSON.stringify({ workflow: 'public-information-request', department: textHelper(input, 'department'), identifiers: textHelper(input, 'identifiers'), searchTerms: textHelper(input, 'searchTerms'), subjectMatter: subject }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} concerning ${subject ?? 'the requested topic'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end, custodian: textHelper(input, 'department') ?? undefined })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('topic')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic of the information you seek.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PUBLIC_INFO_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'public information record')
    },
  },
})

// ── Open Records Request ──
export const openRecordsRequestWorkflow = createRecordsWorkflow({
  id: 'open-records-request',
  name: 'Open Records Request',
  description: 'Request open records and government documents under state and local open records laws.',
  searchIntent: 'open records request',
  seo: { title: 'Open Records Request — State & Local Government Records', description: 'Build an open records request for state and local government records under applicable open records laws.', canonicalPath: '/workflows/open-records-request' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency / department', required: true, helpText: 'State or local government agency.' },
    { id: 'department', label: 'Specific office', helpText: 'Particular office or records custodian.' },
    { id: 'recordsDescription', label: 'Records sought', required: true, helpText: 'Describe the records with reasonable specificity.' },
    { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the record period.' },
    { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the record period.' },
    { id: 'identifiers', label: 'Identifiers', helpText: 'Case numbers, addresses, project names, etc.' },
    { id: 'searchTerms', label: 'Search terms', helpText: 'Keywords to narrow the search.' },
    { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['agency-records', 'program-records', 'reports-and-data', 'communications', 'policy-and-guidance', 'contracts-and-expenditures', 'personnel-records', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['agency-records', 'program-records', 'reports-and-data', 'communications', 'policy-and-guidance', 'contracts-and-expenditures', 'personnel-records', 'references-and-cross-indexed'] as const)
      return {
        title: `Open Records Request — ${subject ?? 'Government Records'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain government records under applicable open records law.',
        scope: JSON.stringify({ workflow: 'open-records-request', department: textHelper(input, 'department'), identifiers: textHelper(input, 'identifiers'), searchTerms: textHelper(input, 'searchTerms'), subjectMatter: subject }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} concerning ${subject ?? 'the requested topic'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end, custodian: textHelper(input, 'department') ?? undefined })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('topic')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('OPEN_RECORDS_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'open record')
    },
  },
})

// ── Agency Records Request ──
export const agencyRecordsRequestWorkflow = createRecordsWorkflow({
  id: 'agency-records-request',
  name: 'Agency Records Request',
  description: 'Request records from a specific government agency with targeted record categories, custodians, and identifiers.',
  searchIntent: 'agency records request',
  seo: { title: 'Agency Records Request — Targeted Government Agency Records', description: 'Build a targeted agency records request with record categories, custodians, identifiers, and date ranges.', canonicalPath: '/workflows/agency-records-request' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Agency name', required: true, helpText: 'The specific agency or department.' },
    { id: 'department', label: 'Division / office', helpText: 'Division, bureau, or office within the agency.' },
    { id: 'recordsDescription', label: 'Records sought', required: true, helpText: 'Describe the records with reasonable specificity.' },
    { id: 'dateStart', label: 'Record start date', required: true, helpText: 'Beginning of the record period.' },
    { id: 'dateEnd', label: 'Record end date', required: true, helpText: 'End of the record period.' },
    { id: 'identifiers', label: 'Identifiers', helpText: 'Names, case numbers, project numbers, addresses.' },
    { id: 'searchTerms', label: 'Search terms', helpText: 'Keywords to narrow the search.' },
    { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description of the topic.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['agency-records', 'program-records', 'policy-and-guidance', 'contracts-and-expenditures', 'communications', 'inspections-and-audits', 'investigation-records', 'data-and-reports', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['agency-records', 'program-records', 'policy-and-guidance', 'contracts-and-expenditures', 'communications', 'inspections-and-audits', 'investigation-records', 'data-and-reports', 'references-and-cross-indexed'] as const)
      return {
        title: `Agency Records Request — ${subject ?? 'Agency Records'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain records from the identified agency.',
        scope: JSON.stringify({ workflow: 'agency-records-request', department: textHelper(input, 'department'), identifiers: textHelper(input, 'identifiers'), searchTerms: textHelper(input, 'searchTerms'), subjectMatter: subject }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} from ${textHelper(input, 'agency') ?? 'the agency'} concerning ${subject ?? 'the requested topic'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end, custodian: textHelper(input, 'department') ?? undefined })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('topic')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('AGENCY_RECORDS_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'agency record')
    },
  },
})

// ── Government Documents Request ──
export const governmentDocumentsRequestWorkflow = createRecordsWorkflow({
  id: 'government-documents-request',
  name: 'Government Documents Request',
  description: 'Request government documents, reports, publications, and official records from a government agency.',
  searchIntent: 'government documents request',
  seo: { title: 'Government Documents Request — Reports, Publications & Official Records', description: 'Build a government documents request for reports, publications, and official records from a government agency.', canonicalPath: '/workflows/government-documents-request' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Government agency', required: true, helpText: 'Federal, state, or local agency.' },
    { id: 'documentType', label: 'Document type', helpText: 'Report, publication, memo, study, etc.' },
    { id: 'recordsDescription', label: 'Documents sought', required: true, helpText: 'Describe the documents with reasonable specificity.' },
    { id: 'dateStart', label: 'Document start date', required: true, helpText: 'Beginning of the document period.' },
    { id: 'dateEnd', label: 'Document end date', required: true, helpText: 'End of the document period.' },
    { id: 'identifiers', label: 'Identifiers', helpText: 'Document numbers, titles, authors, etc.' },
    { id: 'searchTerms', label: 'Search terms', helpText: 'Keywords to narrow the search.' },
    { id: 'subjectMatter', label: 'Subject / topic', required: true, helpText: 'Plain-English description.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: ['official-documents', 'reports-and-studies', 'publications', 'memoranda-and-directives', 'data-and-datasets', 'correspondence', 'references-and-cross-indexed'] as const,
    build(input: Record<string, unknown>) {
      const subject = textHelper(input, 'subjectMatter')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, ['official-documents', 'reports-and-studies', 'publications', 'memoranda-and-directives', 'data-and-datasets', 'correspondence', 'references-and-cross-indexed'] as const)
      return {
        title: `Government Documents Request — ${subject ?? 'Documents'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain government documents from the identified agency.',
        scope: JSON.stringify({ workflow: 'government-documents-request', documentType: textHelper(input, 'documentType'), identifiers: textHelper(input, 'identifiers'), searchTerms: textHelper(input, 'searchTerms'), subjectMatter: subject }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} from ${textHelper(input, 'agency') ?? 'the agency'} concerning ${subject ?? 'the requested topic'}${textHelper(input, 'documentType') ? ` (type: ${textHelper(input, 'documentType')})` : ''}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('topic')) issues.push({ field: 'subjectMatter', message: 'Describe the subject or topic.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('GOV_DOCS_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'government document')
    },
  },
})
