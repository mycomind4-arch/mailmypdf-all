/**
 * UI View Model Types
 *
 * These are the presentation-layer types the UI consumes.
 * They are decoupled from domain implementation details.
 * Adapters convert domain types → view models.
 *
 * The UI should never import domain modules directly.
 */

// ─── Case ────────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'
export type CaseStatus = 'open' | 'pending' | 'closed'
export type FactCategory = 'verified_fact' | 'user_assertion' | 'inference' | 'unknown' | 'rule' | 'recommendation' | 'conflict'
export type ProvenanceStrength = 'strong' | 'partial' | 'none'
export type WorkflowStepStatus = 'pending' | 'active' | 'complete' | 'blocked'
export type ViolationStatus = 'alleged' | 'under_review' | 'supported' | 'contradicted' | 'corrected' | 'unresolved' | 'closed'
export type EvidenceType =
  | 'notice' | 'agency_record' | 'inspection_report' | 'photo' | 'video'
  | 'permit' | 'property_record' | 'correspondence' | 'police_record'
  | 'public_record' | 'user_statement' | 'ai_research' | 'other'

export interface CaseViewModel {
  caseId: string
  propertyAddress: string
  caseNumber: string
  agency: string
  jurisdiction: string
  status: CaseStatus
  urgency: UrgencyLevel
  urgencyReason: string
  deadline?: DeadlineViewModel
  activeWorkflow?: ActiveWorkflowViewModel
}

export interface DeadlineViewModel {
  date: string
  label: string
  daysRemaining: number | null
  source: string
  submitted: boolean
}

export interface ActiveWorkflowViewModel {
  name: string
  step: number
  totalSteps: number
  stepName: string
}

// ─── Overview ──────────────────────────────────────────────────────────────────

export interface OverviewViewModel {
  urgency: { level: UrgencyLevel; reason: string }
  deadline?: DeadlineViewModel
  topFindings: FindingSummaryViewModel[]
  evidenceStatus: { total: number; byType: Record<string, number>; completeness: number }
  workflowProgress: WorkflowProgressViewModel
  nextBestAction: NextActionViewModel | null
  recentTimeline: TimelineEventViewModel[]
  recentCommunications: CommunicationViewModel[]
}

export interface FindingSummaryViewModel {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'reviewing' | 'resolved' | 'blocked'
  briefDescription: string
  evidenceCount: number
  recommendedAction?: string
}

export interface NextActionViewModel {
  id: string
  title: string
  description: string
  reason: string
  priority: UrgencyLevel
  dueDate?: string
  sourceFindingId?: string
  workflowId?: string
  actionType: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  actionLabel: string
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

export interface TimelineEventViewModel {
  id: string
  date?: string
  dateApproximate?: boolean
  event: string
  description?: string
  factCategory: FactCategory
  source: string
  documentId?: string
  excerpt?: string
  relatedEvidence?: string[]
  relatedFindings?: string[]
  actor?: string
  confidence?: number
}

// ─── Evidence ──────────────────────────────────────────────────────────────────

export interface EvidenceViewModel {
  id: string
  title: string
  type: EvidenceType
  source: string
  date?: string
  hash?: string
  provenance: ProvenanceStrength
  confidence?: number
  relatedFacts?: string[]
  relatedTimelineEvents?: string[]
  relatedFindings?: string[]
  whyItMatters?: string
  excerpt?: string
  pageCount?: number
}

// ─── Findings ──────────────────────────────────────────────────────────────────

export interface FindingViewModel {
  id: string
  type: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'reviewing' | 'resolved' | 'blocked'
  description: string
  whatThisMeans: string
  evidence: string[]
  sources: string[]
  recommendedAction?: string
  humanReviewRequired: boolean
  aiReview?: AIReviewViewModel
  relatedFindings?: string[]
  relatedWorkflowId?: string
}

export interface AIReviewViewModel {
  modelsCompared: number
  agreement: 'AGREEMENT' | 'DISAGREEMENT' | 'NO_REVIEW'
  confidence: 'high' | 'medium' | 'low'
  sourceCount: number
  disagreementDetail?: string
}

// ─── Violations ────────────────────────────────────────────────────────────────

export interface ViolationViewModel {
  id: string
  allegation: string
  codeReference?: string
  source: string
  evidenceCount: number
  status: ViolationStatus
  requiredCorrection?: string
  deadline?: string
  relatedFindings?: string[]
  relatedCommunications?: string[]
}

// ─── Property ──────────────────────────────────────────────────────────────────

export interface PropertyViewModel {
  address: string
  apn?: string
  parcelNumber?: string
  legalDescription?: string
  zoning?: string
  landUse?: string
  acreage?: number
  source: string
  sourceLabel?: string
  openCases?: number
  priorNotices?: number
  permits?: number
  mapAvailable?: boolean
  mapUrl?: string
  dataStatus: 'verified' | 'user_supplied' | 'unavailable' | 'not_searched'
}

// ─── Actions ───────────────────────────────────────────────────────────────────

export interface ActionViewModel {
  id: string
  title: string
  description: string
  priority: UrgencyLevel
  dueDate?: string
  source: string
  relatedWorkflow?: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  sourceFindingId?: string
  workflowId?: string
  actionType: string
}

// ─── Communications ─────────────────────────────────────────────────────────────

export interface CommunicationViewModel {
  id: string
  type: 'draft' | 'sent' | 'delivered' | 'reply' | 'note'
  title: string
  date: string
  recipient?: string
  workflow?: string
  evidenceIds?: string[]
  mailingId?: string
  trackingNumber?: string
  proofHash?: string
  excerpt?: string
}

// ─── Workflow ──────────────────────────────────────────────────────────────────

export interface WorkflowStepViewModel {
  id: string
  title: string
  status: WorkflowStepStatus
  required: boolean
  description: string
  evidenceCount?: number
  blockedReason?: string
}

export interface WorkflowProgressViewModel {
  workflowName: string
  steps: WorkflowStepViewModel[]
  completedSteps: number
  totalSteps: number
  currentStepName: string
  blockedSteps: string[]
}

export interface WorkflowOptionViewModel {
  id: string
  name: string
  description: string
  available: boolean
  reason?: string
  contextPreserved?: string[]
}

// ─── Review ────────────────────────────────────────────────────────────────────

export interface ReviewItemViewModel {
  label: string
  value: string
  factCategory?: FactCategory
  source?: string
}

export interface ReviewConflictViewModel {
  description: string
  sources: string[]
}

export interface HighConsequenceReviewViewModel {
  subject: string
  summary: string
  facts: ReviewItemViewModel[]
  evidence: string[]
  rules: string[]
  conflicts: ReviewConflictViewModel[]
  unknowns: string[]
  risks: string[]
  draftExcerpt?: string
  aiAgreement?: 'AGREEMENT' | 'DISAGREEMENT' | 'NO_REVIEW'
  aiDisagreementDetail?: string
}

// ─── Sidebar ────────────────────────────────────────────────────────────────────

export type CaseAreaView =
  | 'overview' | 'timeline' | 'violations' | 'evidence'
  | 'findings' | 'property' | 'actions' | 'communications' | 'workflows'

export interface SidebarItemViewModel {
  view: CaseAreaView
  label: string
  icon: string
  count?: number
  badge?: { color: string; label: string }
}
