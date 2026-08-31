import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import { FULL_CAPABILITIES, GENERIC_FINDINGS, textHelper, categoriesHelper } from './shared-capabilities'
import { analyzeGenericProduction } from './generic-records-analysis'

// ── Birth Records ──
export const BIRTH_RECORDS_CATEGORIES = ['birth-certificate','registration-records','amendment-records','correspondence','index-and-search-records','references-and-cross-indexed'] as const
export const birthRecordsWorkflow = createRecordsWorkflow({
  id: 'birth-records',
  name: 'Birth Records Request',
  description: 'Request birth certificates, registration records, amendments, and related vital records from the appropriate vital records office.',
  searchIntent: 'birth records request',
  seo: { title: 'Birth Records Request — Certificates & Registration Records', description: 'Build a birth records request for certificates, registration records, amendments, and related vital records.', canonicalPath: '/workflows/birth-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Vital records office', required: true, helpText: 'State or county vital records office.' },
    { id: 'personName', label: 'Person name on record', required: true, helpText: 'Full name as it would appear on the birth record.' },
    { id: 'dateOfBirth', label: 'Date of birth', required: true, helpText: 'Date of birth or approximate date.' },
    { id: 'placeOfBirth', label: 'Place of birth', helpText: 'City, county, or hospital.' },
    { id: 'parentNames', label: 'Parent names', helpText: 'Names of parents as shown on the record.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request and any relevant context.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: BIRTH_RECORDS_CATEGORIES,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, BIRTH_RECORDS_CATEGORIES)
      return {
        title: `Birth Records — ${name ?? 'Person'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain birth records for the identified person.',
        scope: JSON.stringify({ workflow: 'birth-records', personName: name, dateOfBirth: textHelper(input, 'dateOfBirth'), placeOfBirth: textHelper(input, 'placeOfBirth'), parentNames: textHelper(input, 'parentNames') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the person'}${textHelper(input, 'placeOfBirth') ? ` born in ${textHelper(input, 'placeOfBirth')}` : ''}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('person')) issues.push({ field: 'personName', message: 'Provide the person name on the birth record.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('BIRTH_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'birth record')
    },
  },
})

// ── Marriage Records ──
export const MARRIAGE_RECORDS_CATEGORIES = ['marriage-license','marriage-certificate','application-records','officiant-records','amendment-records','correspondence','index-and-search-records','references-and-cross-indexed'] as const
export const marriageRecordsWorkflow = createRecordsWorkflow({
  id: 'marriage-records',
  name: 'Marriage Records Request',
  description: 'Request marriage licenses, certificates, applications, and related vital records from the county clerk or vital records office.',
  searchIntent: 'marriage records request',
  seo: { title: 'Marriage Records Request — Licenses & Certificates', description: 'Build a marriage records request for licenses, certificates, applications, and related vital records.', canonicalPath: '/workflows/marriage-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'County clerk / vital records', required: true, helpText: 'County clerk or vital records office.' },
    { id: 'party1Name', label: 'Party 1 name', helpText: 'Full name of one spouse.' },
    { id: 'party2Name', label: 'Party 2 name', helpText: 'Full name of other spouse.' },
    { id: 'marriageDate', label: 'Marriage date', helpText: 'Date or approximate date of marriage.' },
    { id: 'licenseNumber', label: 'License / certificate number', helpText: 'Marriage license or certificate number.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: MARRIAGE_RECORDS_CATEGORIES,
    build(input: Record<string, unknown>) {
      const p1 = textHelper(input, 'party1Name')
      const p2 = textHelper(input, 'party2Name')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, MARRIAGE_RECORDS_CATEGORIES)
      return {
        title: `Marriage Records — ${p1 && p2 ? `${p1} & ${p2}` : p1 ?? 'Marriage'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain marriage records for the identified parties.',
        scope: JSON.stringify({ workflow: 'marriage-records', party1Name: p1, party2Name: p2, marriageDate: textHelper(input, 'marriageDate'), licenseNumber: textHelper(input, 'licenseNumber') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${p1 && p2 ? `${p1} and ${p2}` : 'the marriage'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('party') && !d.includes('spouse') && !d.includes('marriage')) issues.push({ field: 'partyNames', message: 'Provide at least one party name.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('MARRIAGE_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'marriage record')
    },
  },
})

// ── Divorce Records ──
export const DIVORCE_RECORDS_CATEGORIES = ['divorce-decree','case-file','filings-and-pleadings','correspondence','hearing-records','index-and-search-records','references-and-cross-indexed'] as const
export const divorceRecordsWorkflow = createRecordsWorkflow({
  id: 'divorce-records',
  name: 'Divorce Records Request',
  description: 'Request divorce decrees, case files, and related family court records from the court or vital records office.',
  searchIntent: 'divorce records request',
  seo: { title: 'Divorce Records Request — Decrees & Case Files', description: 'Build a divorce records request for decrees, case files, and related family court records.', canonicalPath: '/workflows/divorce-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Court / vital records office', required: true, helpText: 'Family court or vital records office.' },
    { id: 'party1Name', label: 'Party 1 name', helpText: 'Full name of one spouse.' },
    { id: 'party2Name', label: 'Party 2 name', helpText: 'Full name of other spouse.' },
    { id: 'caseNumber', label: 'Case number', helpText: 'Divorce case number.' },
    { id: 'divorceDate', label: 'Divorce date', helpText: 'Date or approximate date of divorce.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: DIVORCE_RECORDS_CATEGORIES,
    build(input: Record<string, unknown>) {
      const p1 = textHelper(input, 'party1Name')
      const p2 = textHelper(input, 'party2Name')
      const caseNum = textHelper(input, 'caseNumber')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, DIVORCE_RECORDS_CATEGORIES)
      return {
        title: `Divorce Records — ${caseNum ?? (p1 && p2 ? `${p1} & ${p2}` : p1 ?? 'Divorce')}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain divorce records for the identified parties.',
        scope: JSON.stringify({ workflow: 'divorce-records', party1Name: p1, party2Name: p2, caseNumber: caseNum, divorceDate: textHelper(input, 'divorceDate') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${p1 && p2 ? `${p1} and ${p2}` : 'the divorce'}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('party') && !d.includes('divorce')) issues.push({ field: 'partyNames', message: 'Provide at least one party name or the case number.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('DIVORCE_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'divorce record')
    },
  },
})

// ── Death Records ──
export const DEATH_RECORDS_CATEGORIES = ['death-certificate','registration-records','amendment-records','correspondence','index-and-search-records','references-and-cross-indexed'] as const
export const deathRecordsWorkflow = createRecordsWorkflow({
  id: 'death-records',
  name: 'Death Records Request',
  description: 'Request death certificates, registration records, and related vital records from the appropriate vital records office.',
  searchIntent: 'death records request',
  seo: { title: 'Death Records Request — Certificates & Registration Records', description: 'Build a death records request for certificates, registration records, and related vital records.', canonicalPath: '/workflows/death-records' },
  intakeVersion: '1.0.0',
  intake: [
    { id: 'agency', label: 'Vital records office', required: true, helpText: 'State or county vital records office.' },
    { id: 'personName', label: 'Deceased person name', required: true, helpText: 'Full name of the deceased.' },
    { id: 'dateOfDeath', label: 'Date of death', helpText: 'Date or approximate date of death.' },
    { id: 'placeOfDeath', label: 'Place of death', helpText: 'City, county, or location.' },
    { id: 'dateStart', label: 'Search start date', required: true, helpText: 'Beginning of search period.' },
    { id: 'dateEnd', label: 'Search end date', required: true, helpText: 'End of search period.' },
    { id: 'subjectMatter', label: 'Purpose / subject', required: true, helpText: 'Reason for the request.' },
  ] as const,
  capabilities: FULL_CAPABILITIES,
  request: {
    categories: DEATH_RECORDS_CATEGORIES,
    build(input: Record<string, unknown>) {
      const name = textHelper(input, 'personName')
      const start = textHelper(input, 'dateStart')
      const end = textHelper(input, 'dateEnd')
      const selected = categoriesHelper(input, DEATH_RECORDS_CATEGORIES)
      return {
        title: `Death Records — ${name ?? 'Deceased'}`,
        agency: textHelper(input, 'agency') ?? '',
        jurisdiction: textHelper(input, 'jurisdiction'),
        purpose: textHelper(input, 'purpose') ?? 'Obtain death records for the identified person.',
        scope: JSON.stringify({ workflow: 'death-records', personName: name, dateOfDeath: textHelper(input, 'dateOfDeath'), placeOfDeath: textHelper(input, 'placeOfDeath') }),
        items: selected.map(cat => ({ category: cat, description: `${cat.replace(/-/g, ' ')} for ${name ?? 'the deceased'}${textHelper(input, 'placeOfDeath') ? ` in ${textHelper(input, 'placeOfDeath')}` : ''}. Cover ${start} through ${end}.`, dateStart: start, dateEnd: end })),
      }
    },
  },
  validate(request: ValidatedRequest) {
    const d = request.items.map(i => i.description.toLowerCase()).join(' ')
    const issues: { field: string; message: string }[] = []
    if (!d.includes('deceased') && !d.includes('person')) issues.push({ field: 'personName', message: 'Provide the name of the deceased person.' })
    return issues
  },
  responseAnalysis: {
    findingTypes: GENERIC_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('DEATH_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const s = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly { id: string; filename: string; category?: string; text?: string; sha256?: string }[] }
      return analyzeGenericProduction((s.requestedItems ?? []).map(i => ({ id: i.category, label: i.category, keywords: i.description.split(/\W+/).filter(Boolean).slice(0, 16) })), s.records ?? [], 'death record')
    },
  },
})
