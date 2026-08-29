'use client'

import { useState, useMemo } from 'react'
import { colors, typography } from '../tokens/tokens'
import { CaseShell } from './case-shell'
import { CaseOverview } from '../case/overview'
import { Timeline } from '../timeline/timeline'
import { EvidenceCenter } from '../evidence/evidence-center'
import { FindingsCenter } from '../findings/findings-center'
import { ViolationList } from '../findings/violation-list'
import { PropertyPanel } from '../property/property-panel'
import { ActionCenter } from '../actions/action-center'
import { CommunicationsList } from '../communications/communications-list'
import { WorkflowProgress, WorkflowSelector } from '../workflows/workflow-progress'
import { ReviewPanel } from '../review/review-panel'
import type {
  CaseAreaView,
  CaseViewModel,
  OverviewViewModel,
  TimelineEventViewModel,
  EvidenceViewModel,
  FindingViewModel,
  ViolationViewModel,
  PropertyViewModel,
  ActionViewModel,
  CommunicationViewModel,
  WorkflowProgressViewModel,
  WorkflowOptionViewModel,
  HighConsequenceReviewViewModel,
  SidebarItemViewModel,
} from '../types/view-models'

// ─── Workspace Props ───────────────────────────────────────────────────────────

export interface WorkspaceProps {
  caseData: CaseViewModel | null
  sidebarItems: SidebarItemViewModel[]
  overview: OverviewViewModel | null
  timelineEvents: TimelineEventViewModel[]
  evidenceItems: EvidenceViewModel[]
  findings: FindingViewModel[]
  violations: ViolationViewModel[]
  property: PropertyViewModel | null
  actions: ActionViewModel[]
  communications: CommunicationViewModel[]
  workflowProgress: WorkflowProgressViewModel | null
  workflowOptions: WorkflowOptionViewModel[]
  review: HighConsequenceReviewViewModel | null
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      color: colors.textMuted,
      fontSize: typography.sm,
    }}>
      {message}
    </div>
  )
}

// ─── Main Workspace ───────────────────────────────────────────────────────────

export function CodeEnforcementWorkspace(props: WorkspaceProps) {
  const [view, setView] = useState<CaseAreaView>('overview')

  return (
    <CaseShell
      context={props.caseData || emptyCase}
      sidebarItems={props.sidebarItems}
      initialView={view}
      onContinue={() => setView('workflows')}
      onReviewFindings={() => setView('findings')}
    >
      <CaseShellContent view={view} onNavigate={setView} {...props} />
    </CaseShell>
  )
}

// ─── View Router ──────────────────────────────────────────────────────────────

function CaseShellContent({
  view,
  onNavigate,
  caseData,
  overview,
  timelineEvents,
  evidenceItems,
  findings,
  violations,
  property,
}: {
  view: CaseAreaView
  onNavigate: (v: CaseAreaView) => void
} & WorkspaceProps) {
  const reviewFindings = useMemo(
    () => findings.filter(f => f.humanReviewRequired),
    [findings]
  )

  switch (view) {
    case 'overview':
      return overview ? (
        <CaseOverview context={caseData!} data={overview} onNavigate={(v) => onNavigate(v as CaseAreaView)} />
      ) : (
        <EmptyState message="Upload a notice document to begin analysis. The system will extract facts, identify jurisdiction, check for discrepancies, and run investigation cycles." />
      )

    case 'timeline':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Timeline</h2>
          {timelineEvents.length > 0 ? <Timeline events={timelineEvents} /> : <EmptyState message="Timeline events will appear here once a notice is analyzed." />}
        </div>
      )

    case 'violations':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Alleged Violations</h2>
          {violations.length > 0 ? <ViolationList violations={violations} /> : <EmptyState message="Alleged violations will be extracted from the notice document." />}
        </div>
      )

    case 'evidence':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Evidence Center</h2>
          {evidenceItems.length > 0 ? <EvidenceCenter items={evidenceItems} /> : <EmptyState message="Evidence items will appear here as documents are uploaded and analyzed." />}
        </div>
      )

    case 'findings':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Findings & Discrepancies</h2>
          {findings.length > 0 ? <FindingsCenter findings={findings} /> : <EmptyState message="Findings will appear here once the discrepancy engine and investigation layers analyze the case." />}
        </div>
      )

    case 'property':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Property Intelligence</h2>
          {property ? <PropertyPanel info={property} /> : <EmptyState message="Property information will be extracted from the notice and enriched with public records." />}
        </div>
      )

    case 'actions':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Actions</h2>
          <EmptyState message="Recommended actions will appear here based on case findings and strategy analysis." />
        </div>
      )

    case 'communications':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Communications</h2>
          <EmptyState message="Drafts, sent communications, and tracked mail will appear here." />
        </div>
      )

    case 'workflows':
      return (
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '16px' }}>Workflows</h2>
          <EmptyState message="Workflow options will appear here once the case has enough findings to support a defense strategy." />
        </div>
      )

    default:
      return null
  }
}

// ─── Fallback empty case ──────────────────────────────────────────────────────

const emptyCase: CaseViewModel = {
  caseId: 'pending',
  propertyAddress: '',
  caseNumber: '',
  agency: '',
  jurisdiction: '',
  status: 'open',
  urgency: 'medium',
  urgencyReason: 'No document uploaded yet',
}
