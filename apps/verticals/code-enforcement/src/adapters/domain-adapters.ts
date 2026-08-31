/**
 * Domain Adapters
 * 
 * Converts domain-layer outputs (NoticeExtraction, DiscrepancyReport, etc.)
 * into UI view models. The UI never imports domain modules directly.
 */

import type { NoticeExtraction } from '../domain/notice-extraction'
import type { DiscrepancyReport, Discrepancy } from '../domain/discrepancy-engine'
import type { AuthorityAnalysis } from '../domain/authority-analysis'
import type { ScopeAnalysis } from '../domain/scope-analysis'
import type { Jurisdiction } from '../domain/jurisdiction'
import type { EvidenceGraph } from '../domain/evidence-graph'
import type { FullReconciliationResult } from '../domain/reconciliation'
import type { CorrectionStrategyReport } from '../domain/correction-strategy'
import type {
  CaseViewModel,
  OverviewViewModel,
  TimelineEventViewModel,
  EvidenceViewModel,
  FindingViewModel,
  ViolationViewModel,
  PropertyViewModel,
  WorkflowProgressViewModel,
  SidebarItemViewModel,
  UrgencyLevel,
} from '../ui/types/view-models'

// ─── Case ────────────────────────────────────────────────────────────────────

export function toCaseViewModel(
  extraction: NoticeExtraction,
  jurisdiction: Jurisdiction,
  deadlineDate?: string,
): CaseViewModel {
  const daysRemaining = deadlineDate ? daysUntil(deadlineDate) : null
  const urgency = daysRemaining !== null && daysRemaining <= 7 ? 'critical' : daysRemaining !== null && daysRemaining <= 30 ? 'high' : 'medium'
  
  return {
    caseId: extraction.caseNumber.value || 'pending',
    propertyAddress: extraction.propertyAddress.value || '',
    caseNumber: extraction.caseNumber.value || '',
    agency: extraction.agency.value || '',
    jurisdiction: jurisdiction.municipality ? `${jurisdiction.municipality}, ${jurisdiction.state}` : jurisdiction.county ? `${jurisdiction.county}, ${jurisdiction.state}` : jurisdiction.state,
    status: 'open',
    urgency: urgency as UrgencyLevel,
    urgencyReason: daysRemaining !== null && daysRemaining <= 7 ? 'Deadline within 7 days' : daysRemaining !== null && daysRemaining <= 30 ? 'Deadline within 30 days' : 'Case open',
    deadline: deadlineDate ? {
      date: deadlineDate,
      label: 'Response Deadline',
      daysRemaining,
      source: extraction.responseDeadline.value || 'notice',
      submitted: false,
    } : undefined,
  }
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export function toTimelineEvents(extraction: NoticeExtraction): TimelineEventViewModel[] {
  const events: TimelineEventViewModel[] = []
  let counter = 0

  function addEvent(date: string | undefined, event: string, source: string, description?: string) {
    if (!date) return
    events.push({
      id: `tl-${++counter}`,
      date,
      event,
      description,
      factCategory: 'verified_fact',
      source,
    })
  }

  addEvent(extraction.noticeDate.value, 'Notice Issued', 'notice-document', `Notice dated ${extraction.noticeDate.value}`)
  addEvent(extraction.serviceDate.value, 'Notice Served', 'notice-document', `Service date: ${extraction.serviceDate.value}`)
  addEvent(extraction.inspectionDate.value, 'Inspection Scheduled', 'notice-document', `Inspection: ${extraction.inspectionDate.value}`)
  addEvent(extraction.responseDeadline.value, 'Response Deadline', 'notice-document', `Deadline: ${extraction.responseDeadline.value}`)

  // Sort by date descending
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return events
}

// ─── Evidence ────────────────────────────────────────────────────────────────

export function toEvidenceItems(extraction: NoticeExtraction, documentId: string): EvidenceViewModel[] {
  const items: EvidenceViewModel[] = [{
    id: documentId,
    title: 'Uploaded Notice Document',
    type: 'notice',
    source: 'user-upload',
    date: extraction.noticeDate.value,
    provenance: 'strong',
    confidence: extraction.caseNumber.confidence || 0.5,
    whyItMatters: 'Primary source document — all extracted facts trace back to this notice.',
    pageCount: 1,
  }]

  return items
}

// ─── Findings ────────────────────────────────────────────────────────────────

export function toFindings(report: DiscrepancyReport, reconciliation?: FullReconciliationResult): FindingViewModel[] {
  const findings: FindingViewModel[] = []
  let counter = 0

  for (const d of report.discrepancies) {
    findings.push({
      id: `finding-${String(++counter).padStart(3, '0')}`,
      type: d.type.replace(/_/g, ' '),
      title: titleCase(d.type.replace(/_/g, ' ')),
      severity: d.severity,
      status: d.reviewState === 'pending' ? 'open' : d.reviewState === 'resolved' ? 'resolved' : 'reviewing',
      description: d.evidence,
      whatThisMeans: d.rationale,
      evidence: [d.evidence],
      sources: [],
      humanReviewRequired: d.involvesHighConsequence,
      recommendedAction: undefined,
    })
  }

  // Add reconciliation issues as findings
  if (reconciliation) {
    for (const issue of reconciliation.allIssues) {
      findings.push({
        id: `finding-${String(++counter).padStart(3, '0')}`,
        type: `reconciliation: ${issue.category}`,
        title: `${issue.category} — ${issue.severity}`,
        severity: issue.severity,
        status: 'open',
        description: issue.description,
        whatThisMeans: issue.description,
        evidence: [],
        sources: [],
        humanReviewRequired: issue.severity === 'critical',
      })
    }
  }

  return findings
}

// ─── Violations ──────────────────────────────────────────────────────────────

export function toViolations(extraction: NoticeExtraction): ViolationViewModel[] {
  const allegations = extraction.allegedViolations.value || []
  const codeRefs = extraction.codeReferences.value || []
  
  return allegations.map((allegation, i) => ({
    id: `v-${String(i + 1).padStart(3, '0')}`,
    allegation,
    codeReference: codeRefs[i] || undefined,
    source: 'notice-document',
    evidenceCount: 1,
    status: 'alleged' as const,
    deadline: extraction.responseDeadline.value || undefined,
  }))
}

// ─── Property ────────────────────────────────────────────────────────────────

export function toProperty(extraction: NoticeExtraction): PropertyViewModel {
  return {
    address: extraction.propertyAddress.value || '',
    apn: extraction.apn.value || undefined,
    parcelNumber: extraction.parcelNumber.value || undefined,
    source: 'notice-document',
    sourceLabel: 'Extracted from notice',
    dataStatus: 'user_supplied',
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function toSidebarItems(
  evidenceCount: number,
  findingsCount: number,
  violationsCount: number,
): SidebarItemViewModel[] {
  return [
    { view: 'overview', label: 'Overview', icon: 'home' },
    { view: 'timeline', label: 'Timeline', icon: 'clock' },
    { view: 'violations', label: 'Alleged Violations', icon: 'alert', count: violationsCount },
    { view: 'evidence', label: 'Evidence', icon: 'file', count: evidenceCount },
    { view: 'findings', label: 'Findings', icon: 'search', count: findingsCount, badge: findingsCount > 0 ? { color: 'high', label: String(findingsCount) } : undefined },
    { view: 'property', label: 'Property', icon: 'map' },
    { view: 'actions', label: 'Actions', icon: 'check' },
    { view: 'communications', label: 'Communications', icon: 'mail' },
    { view: 'workflows', label: 'Workflows', icon: 'flow' },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number | null {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return Math.ceil((d.getTime() - Date.now()) / 86400000)
  } catch {
    return null
  }
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
