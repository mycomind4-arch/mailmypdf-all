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

export const PLANNING_RECORD_CATEGORIES = [
  'application-intake-submittal-revision-and-status-history',
  'zoning-land-use-overlay-entitlement-and-variance-records',
  'staff-report-analysis-findings-and-recommendations',
  'site-plan-map-drawing-and-project-exhibit-records',
  'agency-applicant-consultant-and-referral-communications',
  'public-notice-mailing-hearing-and-comment-records',
  'planning-commission-board-council-and-decision-records',
  'conditions-of-approval-mitigation-monitoring-and-compliance',
  'environmental-review-technical-study-and-finding-records',
  'cross-referenced-permit-engineering-utility-and-agency-records',
  'source-system-index-version-history-and-withholding-status',
] as const

export const PLANNING_RECORD_CAPABILITIES: readonly RecordsDomainCapability[] = [
  'classification', 'extraction', 'deadline', 'contradiction', 'findings', 'evidence', 'research',
  'risk', 'strategy', 'draft', 'draftProvenance', 'validation', 'review', 'approval', 'mailing',
  'tracking', 'proofAudit',
]

export const PLANNING_RECORD_INTAKE = [
  { id: 'agency', label: 'Planning agency / jurisdiction', required: true, helpText: 'City, county, regional, or other planning/land-use agency.' },
  { id: 'department', label: 'Department / custodian', helpText: 'Planning, community development, zoning, environmental review, clerk, or records unit.' },
  { id: 'address', label: 'Property / project address', helpText: 'Street address or project site identifier.' },
  { id: 'parcelNumber', label: 'Parcel / APN', helpText: 'Parcel, APN, assessor identifier, tract, lot, or other site identifier.' },
  { id: 'projectNumber', label: 'Project / application number', helpText: 'Planning application, entitlement, case, hearing, or project number.' },
  { id: 'projectName', label: 'Project name', helpText: 'Known development, subdivision, rezoning, variance, or project name.' },
  { id: 'applicant', label: 'Applicant / developer / owner', helpText: 'Applicant, developer, property owner, or authorized project representative.' },
  { id: 'decisionBody', label: 'Decision-making body', helpText: 'Planning commission, zoning board, hearing officer, city council, board of supervisors, or other body.' },
  { id: 'relatedPermit', label: 'Related permit / entitlement', helpText: 'Permit, variance, conditional-use, subdivision, rezoning, design-review, or other related identifier.' },
  { id: 'dateStart', label: 'Beginning date', required: true, helpText: 'Beginning of the planning/project record period.' },
  { id: 'dateEnd', label: 'Ending date', required: true, helpText: 'End of the planning/project record period.' },
  { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'City, county, state, regional district, or other jurisdiction.' },
  { id: 'subjectMatter', label: 'Project / planning objective', required: true, helpText: 'Plain-English description of the planning, zoning, development, or environmental-review matter.' },
] as const

function text(input: Record<string, unknown>, key: string): string | undefined {
  const raw = input[key]
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value || undefined
}

function selectedCategories(input: Record<string, unknown>): string[] {
  const raw = input.categories
  if (!Array.isArray(raw)) return [...PLANNING_RECORD_CATEGORIES]
  const known = new Set(PLANNING_RECORD_CATEGORIES)
  const selected = raw.filter(
    (entry): entry is string => typeof entry === 'string' && known.has(entry as typeof PLANNING_RECORD_CATEGORIES[number]),
  )
  return selected.length ? selected : [...PLANNING_RECORD_CATEGORIES]
}

function scopeText(input: Record<string, unknown>): string {
  const identifiers = [
    text(input, 'projectNumber') && `project/application number ${text(input, 'projectNumber')}`,
    text(input, 'projectName') && `project name ${text(input, 'projectName')}`,
    text(input, 'address') && `property/project address ${text(input, 'address')}`,
    text(input, 'parcelNumber') && `parcel/APN ${text(input, 'parcelNumber')}`,
    text(input, 'applicant') && `applicant/developer/owner ${text(input, 'applicant')}`,
    text(input, 'relatedPermit') && `related permit/entitlement ${text(input, 'relatedPermit')}`,
    text(input, 'decisionBody') && `decision-making body ${text(input, 'decisionBody')}`,
  ].filter(Boolean)
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  return `${identifiers.length ? ` Search using: ${identifiers.join('; ')}.` : ''}${start && end ? ` Cover ${start} through ${end}.` : ''}`
}

function describe(category: string, input: Record<string, unknown>): string {
  const scope = scopeText(input)
  const subject = text(input, 'subjectMatter') ? ` Planning/project objective: ${text(input, 'subjectMatter')}.` : ''
  const descriptions: Record<string, string> = {
    'application-intake-submittal-revision-and-status-history': `Planning or land-use applications, intake records, completeness determinations, submittal logs, revision/resubmittal history, status history, fee/status metadata, application indexes, and records sufficient to identify each material version of the project submission.${scope}`,
    'zoning-land-use-overlay-entitlement-and-variance-records': `Zoning and land-use designations, overlays, entitlement records, variances, conditional-use or special-use records, rezoning records, subdivision or design-review entitlements, interpretation records, and publicly accessible records showing the standards or approvals applied to the project.${scope}`,
    'staff-report-analysis-findings-and-recommendations': `Publicly accessible staff reports, analyses, memoranda, findings, recommendations, issue summaries, referral analyses, decision drafts that are disclosable, and final staff materials used to evaluate or recommend action on the project.${scope}`,
    'site-plan-map-drawing-and-project-exhibit-records': `Publicly accessible site plans, project maps, subdivision or tentative maps, elevations, renderings, drawings, exhibits, landscaping or circulation plans, and material revisions retained as part of the planning record. Request native digital files where maintained and lawfully available.${scope}`,
    'agency-applicant-consultant-and-referral-communications': `Publicly accessible emails, letters, meeting notes, referral responses, transmittals, applicant/consultant communications, interdepartmental communications, and documented communications materially concerning the identified project, subject to applicable privilege, deliberative, privacy, and other access rules.${scope}`,
    'public-notice-mailing-hearing-and-comment-records': `Public notices, hearing notices, publication records, notice-area or distribution records, publicly disclosable mailing records, hearing materials, public comments, written testimony, and records sufficient to document when and how required public notice or comment occurred. Do not request protected personal contact information beyond what is lawfully public.${scope}`,
    'planning-commission-board-council-and-decision-records': `Agendas, agenda packets, minutes, resolutions, findings, hearing records, staff presentations, final decisions, appeal decisions, motions/votes, and publicly accessible records of action by the relevant commission, board, council, hearing officer, or other decision-making body.${scope}`,
    'conditions-of-approval-mitigation-monitoring-and-compliance': `Conditions of approval, mitigation measures, monitoring/reporting records, compliance tracking, condition-satisfaction records, covenant or implementation references, modification records, and publicly accessible records sufficient to identify whether and how project conditions were tracked or changed.${scope}`,
    'environmental-review-technical-study-and-finding-records': `Publicly accessible environmental-review documents, notices, determinations, environmental assessments/reports, technical studies, appendices, mitigation findings, responses to comments, final adopted findings, and source/consultant records retained as part of the public planning record, without assuming privileged drafts are disclosable.${scope}`,
    'cross-referenced-permit-engineering-utility-and-agency-records': `Indexes, referrals, transmittals, identifiers, and publicly accessible cross-references tying the planning matter to building permits, engineering/public-works review, fire, utilities, transportation, health, code enforcement, or other agency records. Request identifiers and cross-references here; detailed permit/inspection production belongs in the dedicated permit workflow.${scope}`,
    'source-system-index-version-history-and-withholding-status': `Project/case indexes, document lists, source-system history, revision/version metadata, upload or filing history, custodian/referral records, records identifying withheld/redacted/unavailable categories, and the stated basis for nonproduction. Request segregable public portions where available.${scope}`,
  }
  return `${descriptions[category] ?? `Records concerning ${category}.${scope}`}${subject}`
}

function validatePlanningRecords(request: ValidatedRequest): readonly { field: string; message: string }[] {
  const issues: { field: string; message: string }[] = []
  const corpus = request.items.map((item) => item.description.toLowerCase()).join(' ')
  const hasIdentifier = corpus.includes('project/application number') || corpus.includes('project name') || corpus.includes('property/project address') || corpus.includes('parcel/apn') || corpus.includes('related permit/entitlement')
  if (!hasIdentifier) issues.push({ field: 'identifiers', message: 'Provide a project/application number, project name, address, parcel/APN, or related entitlement identifier.' })
  if (!corpus.includes('cover ')) issues.push({ field: 'dateRange', message: 'Provide a beginning and ending date for the planning/project record period.' })
  if (!corpus.includes('planning/project objective:')) issues.push({ field: 'subjectMatter', message: 'Describe the planning, zoning, development, or environmental-review objective.' })
  return issues
}

export function buildPlanningRecordsRequest(input: Record<string, unknown>) {
  const projectNumber = text(input, 'projectNumber')
  const projectName = text(input, 'projectName')
  const address = text(input, 'address')
  const start = text(input, 'dateStart')
  const end = text(input, 'dateEnd')
  const categories = selectedCategories(input)
  return {
    title: `Planning & Development Records — ${projectNumber ?? projectName ?? address ?? 'Project'}`,
    agency: text(input, 'agency') ?? '',
    jurisdiction: text(input, 'jurisdiction'),
    purpose: text(input, 'purpose') ?? 'Identify, obtain, and reconcile the application history, zoning/entitlement, staff analysis, project exhibits, communications, notice/hearing, decision, condition/compliance, environmental-review, and cross-agency records for the identified planning matter.',
    scope: JSON.stringify({
      workflow: 'planning-records', projectNumber, projectName, address,
      parcelNumber: text(input, 'parcelNumber'), applicant: text(input, 'applicant'),
      decisionBody: text(input, 'decisionBody'), relatedPermit: text(input, 'relatedPermit'),
      department: text(input, 'department'), dateStart: start, dateEnd: end,
      jurisdiction: text(input, 'jurisdiction'), subjectMatter: text(input, 'subjectMatter'),
    }),
    items: categories.map((category) => ({
      category,
      description: describe(category, input),
      dateStart: start,
      dateEnd: end,
      custodian: text(input, 'department'),
      systemHint: category === 'application-intake-submittal-revision-and-status-history' || category === 'source-system-index-version-history-and-withholding-status'
        ? 'planning / land-use case-management system'
        : category === 'planning-commission-board-council-and-decision-records' || category === 'public-notice-mailing-hearing-and-comment-records'
          ? 'agenda / hearing / clerk records system'
          : category === 'site-plan-map-drawing-and-project-exhibit-records'
            ? 'planning document-management / GIS system'
            : undefined,
      format: category === 'application-intake-submittal-revision-and-status-history' || category === 'source-system-index-version-history-and-withholding-status'
        ? 'native export, CSV, JSON, spreadsheet, or other structured format where maintained and lawfully available'
        : category === 'site-plan-map-drawing-and-project-exhibit-records'
          ? 'native digital plans, drawings, GIS/map files, or highest-quality electronic format where available'
          : undefined,
    })),
  }
}

export const PLANNING_RECORD_FINDINGS = [
  'MISSING_REQUESTED_CATEGORY', 'REFERENCED_RECORD_NOT_PRODUCED', 'IDENTIFIER_MISMATCH', 'DATE_GAP',
  'DUPLICATE_RECORD', 'MISSING_ATTACHMENT', 'UNEXPLAINED_WITHHOLDING', 'REDACTION_REVIEW',
  'PARTIAL_PRODUCTION', 'UNRESPONSIVE_ITEM',
] as const

export const productionPlanningRecordsWorkflow: RecordsWorkflow = createRecordsWorkflow({
  id: 'planning-records',
  name: 'Planning & Development Records Request',
  description: 'Build a project-specific request for planning applications, zoning/entitlements, staff analysis, project exhibits, communications, hearings/decisions, conditions, environmental review, and cross-agency records.',
  searchIntent: 'planning records request',
  seo: {
    title: 'Planning Records Request — Zoning, Applications, Hearings & Development Files',
    description: 'Request planning and development applications, zoning and entitlement records, staff reports, project plans, communications, hearings, decisions, conditions, environmental review, and related agency records.',
    canonicalPath: '/workflows/planning-records',
  },
  intakeVersion: '2.0.0',
  intake: PLANNING_RECORD_INTAKE,
  capabilities: PLANNING_RECORD_CAPABILITIES,
  request: { categories: PLANNING_RECORD_CATEGORIES, build: buildPlanningRecordsRequest },
  validate: validatePlanningRecords,
  policies: [{
    jurisdiction: 'all', version: '2.0.0', rules: {
      preserveApplicationRevisionAndDecisionHistory: true,
      distinguishPlanningEntitlementsFromBuildingPermitProduction: true,
      doNotAssumePrivilegedDeliberativeDraftOrConfidentialMaterialIsPublic: true,
      requestSegregablePublicPortionsAndWithholdingBasis: true,
      doNotRequestProtectedPersonalContactInformationFromNoticeLists: true,
      requestNativePlansMapsAndStructuredIndexesWhereMaintained: true,
      preserveProjectParcelEntitlementAndDecisionIdentifiers: true,
      routeDetailedPermitInspectionAndPlanReviewRecordsToPropertyPermitWorkflow: true,
    },
  }],
  responseAnalysis: {
    findingTypes: PLANNING_RECORD_FINDINGS,
    async analyze(input: unknown) {
      if (!input || typeof input !== 'object') throw new Error('PLANNING_PRODUCTION_ANALYSIS_INPUT_INVALID')
      const source = input as { requestedItems?: readonly { category: string; description: string }[]; records?: readonly GenericProductionRecord[] }
      const records = source.records ?? []
      const requested = (source.requestedItems ?? []).map((item) => ({
        id: item.category,
        label: item.category,
        keywords: item.description.split(/\W+/).filter((word) => word.length >= 4).slice(0, 20),
      }))
      const deterministic = analyzeGenericProduction(requested, records, 'planning record')
      const providers = getConfiguredRecordsLlmProviders()
      if (providers.length < 2) return deterministic

      const policy = { minimumProviders: 2, agreementThreshold: 0.67, maxProviders: 3 } as const
      const requestedCategories = requested.map((item) => item.id)
      const analyzed = await Promise.all(records.slice(0, 20).map(async (record) => ({
        id: record.id,
        classification: await classifyGenericRecord(providers, record, 'planning-records', requestedCategories, policy),
        facts: await extractGenericRecordFacts(providers, record, 'planning-records', policy),
      })))
      const contradictions: Array<{ leftId: string; rightId: string; result: Awaited<ReturnType<typeof assessGenericRecordContradiction>> }> = []
      for (let i = 0; i < Math.min(records.length, 10); i += 1) {
        for (let j = i + 1; j < Math.min(records.length, 10); j += 1) {
          contradictions.push({
            leftId: records[i].id,
            rightId: records[j].id,
            result: await assessGenericRecordContradiction(providers, records[i], records[j], 'planning-records', policy),
          })
        }
      }
      const strategy = await recommendGenericRecordFollowUp(providers, 'planning-records', {
        deterministic,
        requestedItems: source.requestedItems ?? [],
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
