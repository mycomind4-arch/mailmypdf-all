// ─── CASE STRATEGY ORCHESTRATOR (Workflow 0) ─────────────────────────────
// See docs/POWER_WORKFLOWS.md for the design rationale.
//
// Wires the read-only, evidence-only halves of the due-process, property
// reconciliation, and discrepancy engines into one intake pass, then ranks
// the resulting findings by severity and maps each to a recommended
// downstream workflow. Nothing here drafts, sends, or asserts a legal
// conclusion — it only surfaces findings that already have a severity,
// a source, and supporting facts, exactly like every other pipeline in
// this codebase.
//
// This module intentionally duplicates no analysis logic: it calls
// `reconcileProperty`, `runDiscrepancyEngine`, and `DueProcessAnalyzer`
// exactly as the two existing flagship workflows do, and reuses the
// existing `discrepancyToUnified` converter so findings are uniform
// across every consumer.

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

// ── Recommended Next Workflow ──────────────────────────────────────────
// One row per downstream workflow from docs/POWER_WORKFLOWS.md that has
// at least one triggering finding. Never auto-selected — the case owner
// picks which recommendation(s) to act on, same as every Strategy /
// CorrectionStrategy in this codebase.

export interface RecommendedNextWorkflow {
  workflowId: string
  workflowTitle: string
  severity: FindingSeverity
  reason: string
  triggeringFindingIds: string[]
  legallyConsequential: boolean
}

export interface CaseOrchestratorInput {
  extraction: NoticeExtraction
  reportedDeceased?: boolean
  propertyRecords?: PropertyRecord[]
  // Full case timeline — notice(s), hearing(s), decision(s), fine/lien/abatement
  // action(s) — not just the single triggering notice. An empty array is a
  // legitimate input at first intake, before other documents are uploaded.
  timelineEvents: DueProcessTimelineEvent[]
  evidence: DueProcessEvidenceItem[]
  scopeClarity?: string
  timelineAnomalies?: DiscrepancyEngineInput['timelineAnomalies']
  publicRecordFound?: boolean
  authorityConsistent?: DiscrepancyEngineInput['authorityConsistent']
  // True when the response deadline is inside the window where a records
  // request + extension should be the default first move (see
  // docs/POWER_WORKFLOWS.md, Mechanism 2 and Orchestrator step 5).
  deadlineIsNear?: boolean
}

export interface CaseOrchestratorResult {
  findings: UnifiedFinding[]
  summary: ReturnType<typeof findingSummary>
  propertyReconciliation?: PropertyReconciliation
  dueProcessReport: DueProcessReport
  discrepancyReport: DiscrepancyReport
  recommendations: RecommendedNextWorkflow[]
}

// ── Severity ranking (critical first — these can void the action outright) ─

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

// ── Property discrepancies → UnifiedFinding ───────────────────────────────
// property-intelligence.ts predates the unified findings taxonomy and
// returns its own PropertyDiscrepancy[] shape. Convert locally rather than
// changing a well-tested existing module.

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

// ── Finding → recommended workflow map ────────────────────────────────────
// Mirrors docs/POWER_WORKFLOWS.md exactly. Kept as an explicit table rather
// than inferred logic so the mapping stays auditable.

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

// analysisRule values that specifically indicate a standing/recipient
// problem rather than a generic discrepancy (see discrepancy-engine.ts).
const STANDING_ANALYSIS_RULES = new Set(['deceased_recipient', 'owner_mismatch'])

function mapFindingToWorkflow(finding: UnifiedFinding): WorkflowMapEntry {
  if (finding.source === 'due-process') return DUE_PROCESS_WORKFLOW
  if (finding.analysisRule && STANDING_ANALYSIS_RULES.has(finding.analysisRule)) return STANDING_WORKFLOW
  return DISCREPANCY_WORKFLOW
}

// ── Orchestrator ───────────────────────────────────────────────────────────

export function runCaseOrchestrator(input: CaseOrchestratorInput): CaseOrchestratorResult {
  const hasComplaintNumber = !!input.extraction.complaintNumber?.value
  const hasCaseNumber = !!input.extraction.caseNumber?.value
  const hasInspectionAuthority = !!input.extraction.inspectionAuthority?.value

  // ── Property reconciliation (recipient/standing signal source) ─────────
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

  // ── Discrepancy engine ──────────────────────────────────────────────────
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

  // ── Due-process audit over the FULL case timeline ─────────────────────
  const dueProcessReport = new DueProcessAnalyzer().analyze(input.evidence, input.timelineEvents)

  // ── Unify findings ──────────────────────────────────────────────────────
  const findings: UnifiedFinding[] = [
    ...discrepancyReport.discrepancies.map(discrepancyToUnified),
    ...new DueProcessAnalyzer().toFindings(dueProcessReport),
    ...(propertyReconciliation?.discrepancies.map(propertyDiscrepancyToUnified) ?? []),
  ]

  const summary = findingSummary(findings)

  // ── Rank recommendations ────────────────────────────────────────────────
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

  // ── Safe default: nothing critical found, but the deadline is close ────
  // Per docs/POWER_WORKFLOWS.md, "Orchestrator step 5" — default to the
  // records-request + extension move rather than drafting under time
  // pressure with no leverage yet identified.
  if (summary.critical === 0 && input.deadlineIsNear) {
    recommendations.push({
      workflowId: RECORDS_REQUEST_WORKFLOW.workflowId,
      workflowTitle: RECORDS_REQUEST_WORKFLOW.workflowTitle,
      severity: 'info',
      reason: 'No critical findings yet and the response deadline is near. Requesting the complete case file is a low-risk first move that can also extend the deadline.',
      triggeringFindingIds: [],
      legallyConsequential: RECORDS_REQUEST_WORKFLOW.legallyConsequential,
    })
  }

  return {
    findings,
    summary,
    propertyReconciliation,
    dueProcessReport,
    discrepancyReport,
    recommendations,
  }
}
