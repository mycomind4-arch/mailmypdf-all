// ─── CASE STRATEGY ORCHESTRATOR (Workflow 0) ─────────────────────────────
// See docs/POWER_WORKFLOWS.md for the design rationale.
//
// Wires the read-only, evidence-only halves of the due-process, property
// reconciliation, discrepancy, and FairProcess source-requirement engines into
// one intake pass, then ranks findings and evidence gaps into recommended
// downstream workflows. Nothing here drafts, sends, or asserts a legal
// conclusion.

import { reconcileProperty } from '../domain/property-intelligence'
import type { PropertyRecord, PropertyReconciliation, PropertyDiscrepancy } from '../domain/property-intelligence'
import { runDiscrepancyEngine } from '../domain/discrepancy-engine'
import type { DiscrepancyEngineInput, DiscrepancyReport } from '../domain/discrepancy-engine'
import { DueProcessAnalyzer } from '../due-process/analyzer'
import type { DueProcessReport, DueProcessTimelineEvent, DueProcessEvidenceItem } from '../due-process/analyzer'
import { discrepancyToUnified } from '../findings/converter'
import { findingSummary } from '../findings/taxonomy'
import type { UnifiedFinding, FindingSeverity } from '../findings/taxonomy'
import type { NoticeExtraction } from '../domain/notice-extraction'
import {
  buildPublicRecordsRequestBatches,
  buildRecordsInvestigationTaskPlan,
  toAttorneyPacketSourceReadiness,
  type PublicRecordsRequestBatch,
  type RecordsInvestigationTaskPlan,
} from '../fairprocess/records-investigation'
import {
  buildFairProcessRecordsRequestHandoffs,
  type FairProcessRecordsRequestHandoff,
  type FairProcessRecordsRequestHandoffContext,
} from '../fairprocess/records-request-handoff'
import type { RecordsInvestigationPlan } from '../fairprocess/source-requirements'
import type { AttorneyPacketSourceReadiness, JurisdictionPack } from '../fairprocess/types'

export interface RecommendedNextWorkflow {
  workflowId: string
  workflowTitle: string
  severity: FindingSeverity
  reason: string
  triggeringFindingIds: string[]
  triggeringSourceRequirementIds?: string[]
  legallyConsequential: boolean
}

export interface CaseOrchestratorInput {
  extraction: NoticeExtraction
  reportedDeceased?: boolean
  propertyRecords?: PropertyRecord[]
  timelineEvents: DueProcessTimelineEvent[]
  evidence: DueProcessEvidenceItem[]
  scopeClarity?: string
  timelineAnomalies?: DiscrepancyEngineInput['timelineAnomalies']
  publicRecordFound?: boolean
  authorityConsistent?: DiscrepancyEngineInput['authorityConsistent']
  deadlineIsNear?: boolean
  /**
   * Optional FairProcess source plan. Workflow 0 can run before jurisdiction
   * resolution, but once a pack and source plan exist it turns evidence gaps
   * into jurisdiction-routed records tasks and attorney-handoff gating.
   */
  sourceRequirementPlan?: RecordsInvestigationPlan
  jurisdictionPack?: JurisdictionPack
  /**
   * Known case facts needed by the existing Records Request vertical. Missing
   * required fields are surfaced as blockers; Workflow 0 never invents them.
   */
  recordsRequestContext?: FairProcessRecordsRequestHandoffContext
}

export interface CaseOrchestratorResult {
  findings: UnifiedFinding[]
  summary: ReturnType<typeof findingSummary>
  propertyReconciliation?: PropertyReconciliation
  dueProcessReport: DueProcessReport
  discrepancyReport: DiscrepancyReport
  recommendations: RecommendedNextWorkflow[]
  recordsInvestigation?: RecordsInvestigationTaskPlan
  publicRecordsRequestBatches?: PublicRecordsRequestBatch[]
  recordsRequestHandoffs?: FairProcessRecordsRequestHandoff[]
  sourceReadiness?: AttorneyPacketSourceReadiness
}

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

let propertyFindingSeq = 0

function propertyDiscrepancyToUnified(d: PropertyDiscrepancy): UnifiedFinding {
  propertyFindingSeq += 1
  return {
    id: `property-finding-${propertyFindingSeq}-${Date.now()}`,
    type: 'IDENTIFIER_MISMATCH',
    severity: d.severity as FindingSeverity,
    statement: d.description,
    supportingFacts: [`Notice: ${d.noticeValue}`, `Record: ${d.recordValue}`],
    confidence: 'high',
    recommendedAction: 'Verify against the property record before responding on the merits.',
    source: 'discrepancy',
    unresolved: true,
    analysisRule: d.type,
  }
}

interface WorkflowMapEntry {
  workflowId: string
  workflowTitle: string
  legallyConsequential: boolean
}

const DUE_PROCESS_WORKFLOW: WorkflowMapEntry = {
  workflowId: 'challenge-due-process-violation',
  workflowTitle: 'Challenge Due Process Violation',
  legallyConsequential: true,
}

const STANDING_WORKFLOW: WorkflowMapEntry = {
  workflowId: 'challenge-notice-recipient',
  workflowTitle: 'Challenge Notice Recipient / Standing',
  legallyConsequential: true,
}

const DISCREPANCY_WORKFLOW: WorkflowMapEntry = {
  workflowId: 'cross-reference-complaint-evidence',
  workflowTitle: 'Cross-Reference Complaint Against Evidence',
  legallyConsequential: false,
}

const RECORDS_REQUEST_WORKFLOW: WorkflowMapEntry = {
  workflowId: 'request-complete-case-file',
  workflowTitle: 'Request Complete Case File Before Response',
  legallyConsequential: false,
}

const TARGETED_RECORDS_WORKFLOW: WorkflowMapEntry = {
  workflowId: 'investigate-missing-case-records',
  workflowTitle: 'Investigate Missing Case Records',
  legallyConsequential: false,
}

const STANDING_ANALYSIS_RULES = new Set(['deceased_recipient', 'owner_mismatch'])

function mapFindingToWorkflow(finding: UnifiedFinding): WorkflowMapEntry {
  if (finding.source === 'due-process') return DUE_PROCESS_WORKFLOW
  if (finding.analysisRule && STANDING_ANALYSIS_RULES.has(finding.analysisRule)) return STANDING_WORKFLOW
  return DISCREPANCY_WORKFLOW
}

function buildFairProcessRecordsRecommendation(
  recordsInvestigation: RecordsInvestigationTaskPlan,
): RecommendedNextWorkflow | undefined {
  const actionableTasks = recordsInvestigation.tasks.filter(
    (task) => task.status === 'ready' || task.status === 'requested' || task.status === 'received',
  )
  if (actionableTasks.length === 0) return undefined

  const sourceRequirementIds = actionableTasks.map((task) => task.requirementId).sort()
  const criticalTasks = actionableTasks.filter((task) => task.priority === 'critical')
  const highTasks = actionableTasks.filter((task) => task.priority === 'high')
  const severity: FindingSeverity = criticalTasks.length > 0
    ? 'high'
    : highTasks.length > 0
      ? 'medium'
      : 'info'

  const objectiveSummary = actionableTasks
    .slice(0, 4)
    .map((task) => task.objective)
    .join('; ')
  const remainder = Math.max(0, actionableTasks.length - 4)

  return {
    workflowId: TARGETED_RECORDS_WORKFLOW.workflowId,
    workflowTitle: TARGETED_RECORDS_WORKFLOW.workflowTitle,
    severity,
    reason: `FairProcess identified ${actionableTasks.length} unresolved source requirement(s): ${objectiveSummary}${remainder > 0 ? `; plus ${remainder} more` : ''}. Obtain and verify these records before treating missing evidence as proof of absence.`,
    triggeringFindingIds: [],
    triggeringSourceRequirementIds: sourceRequirementIds,
    legallyConsequential: false,
  }
}

export function runCaseOrchestrator(input: CaseOrchestratorInput): CaseOrchestratorResult {
  const hasComplaintNumber = !!input.extraction.complaintNumber?.value
  const hasCaseNumber = !!input.extraction.caseNumber?.value
  const hasInspectionAuthority = !!input.extraction.inspectionAuthority?.value

  const propertyReconciliation = input.propertyRecords?.length
    ? reconcileProperty(
        {
          propertyAddress: input.extraction.propertyAddress,
          apn: input.extraction.apn,
          recipient: input.extraction.recipient,
        },
        input.propertyRecords,
      )
    : undefined

  const discrepancyReport = runDiscrepancyEngine({
    recipientName: input.extraction.recipient?.value || undefined,
    reportedDeceased: input.reportedDeceased ?? false,
    recordOwner: propertyReconciliation?.recordOwner,
    noticeAddress: input.extraction.propertyAddress?.value || undefined,
    recordAddress: propertyReconciliation?.recordAddress,
    noticeApn: input.extraction.apn?.value || undefined,
    recordApn: propertyReconciliation?.recordApn,
    hasComplaintNumber,
    hasCaseNumber,
    hasNoticeDate: !!input.extraction.noticeDate?.value,
    hasServiceDate: !!input.extraction.serviceDate?.value,
    hasDeadline: !!input.extraction.responseDeadline?.value,
    hasInspectionAuthority,
    hasConsentWording: !!input.extraction.consentWording?.value,
    hasWarrantWording: !!input.extraction.warrantWording?.value,
    scopeClarity: input.scopeClarity,
    timelineAnomalies: input.timelineAnomalies,
    publicRecordFound: input.publicRecordFound,
    authorityConsistent: input.authorityConsistent,
  })

  const dueProcessAnalyzer = new DueProcessAnalyzer()
  const dueProcessReport = dueProcessAnalyzer.analyze(input.evidence, input.timelineEvents)

  const findings: UnifiedFinding[] = [
    ...discrepancyReport.discrepancies.map(discrepancyToUnified),
    ...dueProcessAnalyzer.toFindings(dueProcessReport),
    ...(propertyReconciliation?.discrepancies.map(propertyDiscrepancyToUnified) ?? []),
  ]

  const summary = findingSummary(findings)

  const grouped = new Map<string, { entry: WorkflowMapEntry; findings: UnifiedFinding[]; worstSeverity: FindingSeverity }>()

  for (const finding of findings) {
    const entry = mapFindingToWorkflow(finding)
    const existing = grouped.get(entry.workflowId)
    if (!existing) {
      grouped.set(entry.workflowId, { entry, findings: [finding], worstSeverity: finding.severity })
      continue
    }
    existing.findings.push(finding)
    if (SEVERITY_RANK[finding.severity] < SEVERITY_RANK[existing.worstSeverity]) {
      existing.worstSeverity = finding.severity
    }
  }

  const recommendations: RecommendedNextWorkflow[] = Array.from(grouped.values())
    .map(({ entry, findings: groupFindings, worstSeverity }) => ({
      workflowId: entry.workflowId,
      workflowTitle: entry.workflowTitle,
      severity: worstSeverity,
      reason: groupFindings.map((f) => f.statement).join(' '),
      triggeringFindingIds: groupFindings.map((f) => f.id),
      legallyConsequential: entry.legallyConsequential,
    }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  let recordsInvestigation: RecordsInvestigationTaskPlan | undefined
  let publicRecordsRequestBatches: PublicRecordsRequestBatch[] | undefined
  let recordsRequestHandoffs: FairProcessRecordsRequestHandoff[] | undefined
  let sourceReadiness: AttorneyPacketSourceReadiness | undefined

  if (input.sourceRequirementPlan && input.jurisdictionPack) {
    recordsInvestigation = buildRecordsInvestigationTaskPlan(
      input.sourceRequirementPlan,
      input.jurisdictionPack,
    )
    publicRecordsRequestBatches = buildPublicRecordsRequestBatches(recordsInvestigation)
    sourceReadiness = toAttorneyPacketSourceReadiness(input.sourceRequirementPlan)

    if (input.recordsRequestContext) {
      recordsRequestHandoffs = buildFairProcessRecordsRequestHandoffs({
        taskPlan: recordsInvestigation,
        batches: publicRecordsRequestBatches,
        jurisdiction: input.jurisdictionPack,
        context: input.recordsRequestContext,
      })
    }

    const recordsRecommendation = buildFairProcessRecordsRecommendation(recordsInvestigation)
    if (recordsRecommendation) recommendations.push(recordsRecommendation)
  }

  if (
    summary.critical === 0 &&
    input.deadlineIsNear &&
    !recommendations.some((recommendation) =>
      recommendation.workflowId === TARGETED_RECORDS_WORKFLOW.workflowId ||
      recommendation.workflowId === RECORDS_REQUEST_WORKFLOW.workflowId,
    )
  ) {
    recommendations.push({
      workflowId: RECORDS_REQUEST_WORKFLOW.workflowId,
      workflowTitle: RECORDS_REQUEST_WORKFLOW.workflowTitle,
      severity: 'info',
      reason: 'No critical findings yet and the response deadline is near. Request the complete case file before drafting under time pressure.',
      triggeringFindingIds: [],
      legallyConsequential: RECORDS_REQUEST_WORKFLOW.legallyConsequential,
    })
  }

  recommendations.sort((a, b) =>
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.workflowId.localeCompare(b.workflowId),
  )

  return {
    findings,
    summary,
    propertyReconciliation,
    dueProcessReport,
    discrepancyReport,
    recommendations,
    recordsInvestigation,
    publicRecordsRequestBatches,
    recordsRequestHandoffs,
    sourceReadiness,
  }
}
