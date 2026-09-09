import type { ValidatedRequest } from '../request-service'
import { createRecordsWorkflow, type RecordsWorkflow } from '../workflow-factory'
import type { RecordsDomainCapability } from './domain-pack'
import { analyzeGenericProduction, type GenericProductionRecord } from './generic-records-analysis'
import {
  assessGenericRecordContradiction,
  classifyGenericRecord,
  extractGenericRecordFacts,
  recommendGenericRecordFollowUp,
} from './generic-records-ai'
import { getConfiguredRecordsLlmProviders } from '../ai/records-llm-providers'

export const COURT_RECORD_CATEGORIES = [
  'docket-register-case-index-and-status',
  'initiating-pleadings-and-filed-claims',
  'motions-briefs-responses-and-filed-support',
  'orders-rulings-judgments-and-decrees',
  'hearing-minute-calendar-and-scheduling-records',
  'transcript-recording-and-reporter-index-records',
  'filed-exhibit-attachment-and-evidence-indexes',
  'notice-service-clerk-and-filed-correspondence-records',
  'case-assignment-party-attorney-and-administration-records',
  'sealing-confidentiality-redaction-and-access-status-records',
] as const

export const COURT_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const COURT_RECORD_INTAKE = [
  { id: 'court', label: 'Court', required: true, helpText: 'Federal, state, county, municipal, administrative, or other court likely to hold the records.' },
  { id: 'division', label: 'Division / department', helpText: 'Civil, family, probate, housing, traffic, small claims, appellate, or other division.' },
  { id: 'caseNumber', label: 'Case / docket number', helpText: 'Case, docket, proceeding, appeal, or file number when known.' },
  { id: 'parties', label: 'Parties', helpText: 'Plaintiff, defendant, petitioner, respondent, appellant, appellee, or other party names.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the relevant filing or proceeding period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the relevant filing or proceeding period.' },
  { id: 'caseType', label: 'Case type', helpText: 'Civil, family, probate, housing, traffic, appellate, small claims, or another classification.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'State, county, federal district/circuit, municipality, or other jurisdiction.' },
  { id: 'accessBasis', label: 'Requester capacity / access basis', helpText: 'Public-access request, party/counsel access, authorized representative, or another lawful basis when relevant.' },
  { id: 'subjectMatter', label: 'Case / records description', required: true, helpText: 'Plain-English description of the matter and records sought.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...COURT_RECORD_CATEGORIES]
  const known = new Set(COURT_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof COURT_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...COURT_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'caseNumber') && `case/docket number ${text(input, 'caseNumber')}`,
    text(input, 'parties') && `parties ${text(input, 'parties')}`,
    text(input, 'division') && `division/department ${text(input, 'division')}`,
    text(input, 'caseType') && `case type ${text(input, 'caseType')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Matter/records description: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'docket-register-case-index-and-status': `Docket sheets, registers of actions, case indexes, event/filing lists, case-status history, document indexes, and structured case metadata sufficient to identify the public or otherwise lawfully accessible record of filings, hearings, rulings, and disposition.${scope}`,
    'initiating-pleadings-and-filed-claims': `Publicly accessible complaints, petitions, applications, notices of appeal, answers, counterclaims, amended initiating pleadings, and other filed documents that define the claims or proceeding.${scope}`,
    'motions-briefs-responses-and-filed-support': `Publicly accessible filed motions, briefs, oppositions, responses, replies, declarations, affidavits, memoranda, stipulations, and filed supporting documents associated with the identified matter.${scope}`,
    'orders-rulings-judgments-and-decrees': `Publicly accessible orders, rulings, written decisions, judgments, decrees, dismissals, injunctions, remand orders, and records sufficient to identify the court's material decisions and final disposition.${scope}`,
    'hearing-minute-calendar-and-scheduling-records': `Hearing and trial calendars, minute entries, minute orders, scheduling orders, continuance records, proceeding dates, courtroom/department assignments, and other publicly accessible scheduling records.${scope}`,
    'transcript-recording-and-reporter-index-records': `Transcript indexes, reporter information, transcript-order records, recording indexes, proceeding-recording availability/status, and publicly accessible transcripts or recordings where maintained. Do not assume every proceeding was recorded or that every recording is publicly releasable.${scope}`,
    'filed-exhibit-attachment-and-evidence-indexes': `Publicly accessible exhibit lists, admitted-exhibit indexes, filed attachments, lodged-document indexes, and records sufficient to identify exhibits or evidence referenced in public proceedings. Do not assume unfiled discovery, sealed exhibits, or physical evidence is publicly accessible.${scope}`,
    'notice-service-clerk-and-filed-correspondence-records': `Filed notices, proofs or certificates of service, clerk notices, hearing notices, judgment/disposition notices, and correspondence that is itself part of the public or otherwise lawfully accessible court record.${scope}`,
    'case-assignment-party-attorney-and-administration-records': `Public case-assignment records, judge/department assignment history, party and attorney-of-record information, substitution/withdrawal notices, case classification/status fields, consolidation/related-case references, and other public administrative metadata.${scope}`,
    'sealing-confidentiality-redaction-and-access-status-records': `Publicly disclosable docket entries, orders, notices, or status records identifying sealing, confidentiality, restricted access, redaction, unsealing, or withheld-document status. If content is restricted, request only lawful access-status information and any segregable public portion; do not attempt to circumvent a sealing or confidentiality order.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validateCourtRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  if (!corpus.includes('case/docket number') && !corpus.includes('parties ')) {
    issues.push({ field: 'identifiers', message: 'Provide a case/docket number or party names so the court can identify the matter.' })
  }
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the records period.' })
  if (!corpus.includes('matter/records description:')) issues.push({ field: 'subjectMatter', message: 'Describe the court matter and records sought.' })
  return issues
}

export function buildCourtRecordsRequest(input: Record<string, unknown>) {
  const caseNumber = text(input, 'caseNumber')
  const parties = text(input, 'parties')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Court Records — ${caseNumber ?? parties ?? text(input, 'subjectMatter') ?? 'Matter'}`,
    agency: text(input, 'court') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, obtain, and compare the public or otherwise lawfully accessible docket, filed pleadings, motions, orders, hearing records, transcript indexes, exhibit indexes, service records, administrative metadata, and access-status records for the identified court matter.',
    scope: JSON.stringify({
      workflow: 'court-records', court: text(input, 'court'), division: text(input, 'division'), caseNumber, parties,
      dateStart: start, dateEnd: end, caseType: text(input, 'caseType'), jurisdiction: text(input, 'jurisdiction'),
      accessBasis: text(input, 'accessBasis'), subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'division'),
      systemHint: category === 'docket-register-case-index-and-status' || category === 'case-assignment-party-attorney-and-administration-records'
        ? 'court case-management / docket system'
        : undefined,
      format: category === 'docket-register-case-index-and-status' || category === 'case-assignment-party-attorney-and-administration-records'
        ? 'native docket export, CSV, JSON, spreadsheet, or other structured format where maintained and lawfully available'
        : undefined,
    })),
  }
}

export const COURT_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH', 'DATE_GAP',
  'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionCourtRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'court-records',
  name: 'Court Records Request',
  description: 'Build a case-specific request for public or otherwise lawfully accessible dockets, filed pleadings, motions, orders, hearings, transcript indexes, exhibit indexes, service records, case metadata, and access-status records.',
  searchIntent: 'how to get court records',
  seo: {
    title: 'Court Records Request — Dockets, Filings, Orders, Hearings & Transcripts',
    description: 'Request court dockets, filed pleadings and motions, orders, hearing records, transcript indexes, exhibits, service records, and sealing/access-status records for a specific case.',
    canonicalPath: '/workflows/court-records',
  },
  intakeVersion: '2.0.0',
  intake: COURT_RECORD_INTAKE,
  capabilities: COURT_RECORD_CAPABILITIES,
  request: { categories: COURT_RECORD_CATEGORIES, build: buildCourtRecordsRequest },
  validate: validateCourtRecords,
  policies: [{
    jurisdiction: 'all', version: '2.0.0', rules: {
      requestOnlyPublicAuthorizedOrOtherwiseLawfullyAccessibleCourtRecords: true,
      doNotCircumventSealingConfidentialityOrRestrictedAccessOrders: true,
      doNotAssumeUnfiledDiscoveryOrPhysicalEvidenceIsPublic: true,
      doNotAssumeTranscriptsRecordingsOrExhibitsAreAutomaticallyPublic: true,
      doNotRequestProtectedJuvenileFamilyMedicalOrOtherConfidentialContentsWithoutLawfulAccess: true,
      requestStructuredDocketAndCaseMetadataWhereMaintained: true,
      requestSegregablePublicPortionsAndAccessStatusWhenContentIsRestricted: true,
      preserveCaseIdentifiersAndDocketTimeline: true,
    },
  }],
  responseAnalysis: {
    findingTypes: COURT_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('COURT_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly GenericProductionRecord[] }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category, label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzeGenericProduction(requested, records, 'court record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'court-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'court-records', policy),
      })))
      const contradictions: Array<{ leftId: string; rightId: string; result: Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({ leftId: records[i].id, rightId: records[j].id, result: await assessGenericRecordContradiction(providers, records[i], records[j], 'court-records', policy) })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'court-records', {
        deterministic, requestedItems: source.requestedItems ?? [],
        records: records.slice(0, 20).map((record) => ({ id: record.id, filename: record.filename, category: record.category, text: record.text ?? '' })),
        extracted: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value })),
        contradictions: contradictions.filter((item) => item.result.value.contradictory).map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value })),
      }, policy)
      return {
        ...deterministic,
        aiStrategy: strategy.value,
        aiProvenance: { providers: strategy.providers, confidence: strategy.confidence, disagreements: strategy.disagreements, warnings: strategy.warnings },
        aiRecordAnalysis: analyzed.map((item) => ({ id: item.id, classification: item.classification.value, facts: item.facts.value, classificationProvenance: item.classification.providers, factProvenance: item.facts.providers })),
        aiContradictions: contradictions.filter((item) => item.result.value.contradictory).map((item) => ({ leftId: item.leftId, rightId: item.rightId, analysis: item.result.value, providers: item.result.providers })),
      }
    },
  },
})
