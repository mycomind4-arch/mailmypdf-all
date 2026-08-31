/**
 * UI View Model & Fixture Tests
 *
 * These tests verify the fixture data conforms to the typed view models,
 * and the key UI behaviors are correctly expressed in the data layer.
 */

import { describe, it, expect } from 'vitest'
import {
  fixtureCase,
  fixtureSidebar,
  fixtureOverview,
  fixtureTimeline,
  fixtureEvidence,
  fixtureFindings,
  fixtureViolations,
  fixtureProperty,
  fixtureActions,
  fixtureCommunications,
  fixtureWorkflowProgress,
  fixtureWorkflowOptions,
  fixtureReview,
} from '../../src/ui/fixtures/mckinleyville'
import type {
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
} from '../../src/ui/types/view-models'

// ─── Deceased-recipient discrepancy ──────────────────────────────────────────

describe('Deceased-recipient discrepancy', () => {
  it('identifies the critical recipient discrepancy finding', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-001')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('critical')
    expect(finding!.type).toBe('recipient_discrepancy')
    expect(finding!.title).toContain('Recipient Identity')
  })

  it('has evidence linking the notice recipient to property records', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-001')
    expect(finding!.evidence.length).toBeGreaterThan(0)
    expect(finding!.sources).toContain('doc-001')
    expect(finding!.sources).toContain('doc-002')
  })

  it('marks the finding as requiring human review', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-001')
    expect(finding!.humanReviewRequired).toBe(true)
  })

  it('triggers the high-consequence review with correct facts', () => {
    expect(fixtureReview.subject).toContain('Recipient Identity')
    const facts = fixtureReview.facts
    const recipientFact = facts.find(f => f.label.includes('recipient'))
    expect(recipientFact).toBeDefined()
    expect(recipientFact!.value).toContain('deceased')
    expect(recipientFact!.factCategory).toBe('verified_fact')
  })

  it('shows AI agreement on the discrepancy', () => {
    expect(fixtureReview.aiAgreement).toBe('AGREEMENT')
  })

  it('lists the conflict between notice recipient and property owner', () => {
    expect(fixtureReview.conflicts.length).toBeGreaterThan(0)
    const conflict = fixtureReview.conflicts[0]
    expect(conflict.description).toContain('Jane Doe')
    expect(conflict.description).toContain('John Doe')
    expect(conflict.sources).toContain('doc-001')
    expect(conflict.sources).toContain('doc-002')
  })
})

// ─── High-severity finding ───────────────────────────────────────────────────

describe('High-severity findings', () => {
  it('has at least one critical and one high severity finding', () => {
    const critical = fixtureFindings.filter(f => f.severity === 'critical')
    const high = fixtureFindings.filter(f => f.severity === 'high')
    expect(critical.length).toBeGreaterThanOrEqual(1)
    expect(high.length).toBeGreaterThanOrEqual(1)
  })

  it('the missing inspection authority finding is high severity', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-002')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    expect(finding!.title).toContain('Missing Inspection Authority')
  })

  it('shows AI disagreement on the authority finding', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-002')
    expect(finding!.aiReview).toBeDefined()
    expect(finding!.aiReview!.agreement).toBe('DISAGREEMENT')
    expect(finding!.aiReview!.disagreementDetail).toBeDefined()
  })

  it('overview lists top findings including critical', () => {
    expect(fixtureOverview.topFindings.length).toBeGreaterThan(0)
    const hasCritical = fixtureOverview.topFindings.some(f => f.severity === 'critical')
    expect(hasCritical).toBe(true)
  })
})

// ─── Deadline ────────────────────────────────────────────────────────────────

describe('Deadline', () => {
  it('has a response deadline with days remaining', () => {
    expect(fixtureCase.deadline).toBeDefined()
    expect(fixtureCase.deadline!.daysRemaining).not.toBeNull()
    expect(fixtureCase.deadline!.daysRemaining!).toBeGreaterThan(0)
  })

  it('deadline is sourced from the notice document', () => {
    expect(fixtureCase.deadline!.source).toContain('notice')
  })

  it('overview shows the same deadline', () => {
    expect(fixtureOverview.deadline).toBeDefined()
    expect(fixtureOverview.deadline!.date).toBe(fixtureCase.deadline!.date)
  })

  it('timeline has a deadline event', () => {
    const deadlineEvent = fixtureTimeline.find(e =>
      e.event.toLowerCase().includes('deadline') || e.event.toLowerCase().includes('due')
    )
    expect(deadlineEvent).toBeDefined()
    expect(deadlineEvent!.factCategory).toBe('verified_fact')
  })

  it('deadline is not yet submitted', () => {
    expect(fixtureCase.deadline!.submitted).toBe(false)
  })
})

// ─── Evidence / source linking ───────────────────────────────────────────────

describe('Evidence and source linking', () => {
  it('evidence items have provenance strength', () => {
    for (const e of fixtureEvidence) {
      expect(['strong', 'partial', 'none']).toContain(e.provenance)
    }
  })

  it('the notice evidence links to timeline events', () => {
    const notice = fixtureEvidence.find(e => e.id === 'doc-001')
    expect(notice).toBeDefined()
    expect(notice!.relatedTimelineEvents).toContain('tl-001')
    expect(notice!.relatedTimelineEvents).toContain('tl-005')
  })

  it('evidence links to findings', () => {
    const notice = fixtureEvidence.find(e => e.id === 'doc-001')
    expect(notice!.relatedFindings).toContain('finding-001')
    expect(notice!.relatedFindings).toContain('finding-002')
  })

  it('property record evidence links to the recipient discrepancy finding', () => {
    const prop = fixtureEvidence.find(e => e.id === 'doc-002')
    expect(prop).toBeDefined()
    expect(prop!.relatedFindings).toContain('finding-001')
  })

  it('timeline events reference their source documents', () => {
    const noticeEvent = fixtureTimeline.find(e => e.id === 'tl-001')
    expect(noticeEvent!.relatedEvidence).toContain('doc-001')
  })

  it('user statement evidence has none provenance', () => {
    const stmt = fixtureEvidence.find(e => e.id === 'stmt-001')
    expect(stmt!.provenance).toBe('none')
    expect(stmt!.type).toBe('user_statement')
  })

  it('findings reference their evidence sources', () => {
    const finding = fixtureFindings.find(f => f.id === 'finding-001')
    expect(finding!.sources.length).toBeGreaterThan(0)
  })
})

// ─── Workflow progress ───────────────────────────────────────────────────────

describe('Workflow progress', () => {
  it('has 14 steps in the inspection workflow', () => {
    expect(fixtureWorkflowProgress.totalSteps).toBe(14)
  })

  it('has completed 4 steps', () => {
    expect(fixtureWorkflowProgress.completedSteps).toBe(4)
  })

  it('current step is recipient reconciliation', () => {
    expect(fixtureWorkflowProgress.currentStepName).toContain('Recipient')
  })

  it('has the secure_ingest step as complete', () => {
    const step = fixtureWorkflowProgress.steps.find(s => s.id === 'secure_ingest')
    expect(step).toBeDefined()
    expect(step!.status).toBe('complete')
  })

  it('has the recipient_reconciliation step as active', () => {
    const step = fixtureWorkflowProgress.steps.find(s => s.id === 'recipient_reconciliation')
    expect(step).toBeDefined()
    expect(step!.status).toBe('active')
  })

  it('has pending steps after the active step', () => {
    const pendingSteps = fixtureWorkflowProgress.steps.filter(s => s.status === 'pending')
    expect(pendingSteps.length).toBeGreaterThan(0)
  })

  it('has workflow options with context preservation', () => {
    const correction = fixtureWorkflowOptions.find(o => o.id === 'correction')
    expect(correction).toBeDefined()
    expect(correction!.available).toBe(true)
    expect(correction!.contextPreserved).toBeDefined()
    expect(correction!.contextPreserved!.length).toBeGreaterThan(0)
  })

  it('marks unavailable workflows with a reason', () => {
    const unavailable = fixtureWorkflowOptions.find(o => !o.available)
    expect(unavailable).toBeDefined()
    expect(unavailable!.reason).toBeDefined()
  })
})

// ─── Human-review state ──────────────────────────────────────────────────────

describe('Human review state', () => {
  it('critical finding requires human review', () => {
    const critical = fixtureFindings.find(f => f.severity === 'critical')
    expect(critical!.humanReviewRequired).toBe(true)
  })

  it('review panel has facts, evidence, rules, conflicts, and unknowns', () => {
    expect(fixtureReview.facts.length).toBeGreaterThan(0)
    expect(fixtureReview.evidence.length).toBeGreaterThan(0)
    expect(fixtureReview.rules.length).toBeGreaterThan(0)
    expect(fixtureReview.conflicts.length).toBeGreaterThan(0)
    expect(fixtureReview.unknowns.length).toBeGreaterThan(0)
  })

  it('review lists risks', () => {
    expect(fixtureReview.risks.length).toBeGreaterThan(0)
  })

  it('overview next best action links to the critical finding', () => {
    expect(fixtureOverview.nextBestAction).toBeDefined()
    expect(fixtureOverview.nextBestAction!.sourceFindingId).toBe('finding-001')
  })
})

// ─── Mobile / navigation state ────────────────────────────────────────────────

describe('Navigation state', () => {
  it('sidebar has all 9 case areas', () => {
    const views = fixtureSidebar.map(s => s.view)
    expect(views).toContain('overview')
    expect(views).toContain('timeline')
    expect(views).toContain('evidence')
    expect(views).toContain('findings')
    expect(views).toContain('violations')
    expect(views).toContain('property')
    expect(views).toContain('actions')
    expect(views).toContain('communications')
    expect(views).toContain('workflows')
    expect(views.length).toBe(9)
  })

  it('sidebar items have counts where applicable', () => {
    const timeline = fixtureSidebar.find(s => s.view === 'timeline')
    expect(timeline!.count).toBe(fixtureTimeline.length)

    const evidence = fixtureSidebar.find(s => s.view === 'evidence')
    expect(evidence!.count).toBe(fixtureEvidence.length)

    const findings = fixtureSidebar.find(s => s.view === 'findings')
    expect(findings!.count).toBe(fixtureFindings.length)
  })

  it('findings sidebar has a critical badge', () => {
    const findings = fixtureSidebar.find(s => s.view === 'findings')
    expect(findings!.badge).toBeDefined()
    expect(findings!.badge!.label).toContain('CRITICAL')
  })

  it('case context has all required fields for the header', () => {
    expect(fixtureCase.propertyAddress).toBeDefined()
    expect(fixtureCase.caseNumber).toBeDefined()
    expect(fixtureCase.agency).toBeDefined()
    expect(fixtureCase.jurisdiction).toBeDefined()
    expect(fixtureCase.status).toBeDefined()
    expect(fixtureCase.urgency).toBeDefined()
  })
})

// ─── Public workflow → authenticated workflow continuity ────────────────────

describe('Public workflow → authenticated workflow continuity', () => {
  it('fixture case uses the same inspection workflow name', () => {
    expect(fixtureCase.activeWorkflow).toBeDefined()
    expect(fixtureCase.activeWorkflow!.name).toContain('Inspection')
  })

  it('fixture workflow progress matches the active workflow', () => {
    expect(fixtureWorkflowProgress.workflowName).toContain('Inspection')
    expect(fixtureWorkflowProgress.completedSteps).toBe(fixtureCase.activeWorkflow!.step - 1) // active step is not yet complete
    expect(fixtureWorkflowProgress.totalSteps).toBe(fixtureCase.activeWorkflow!.totalSteps)
  })

  it('workflow options include correction and records request', () => {
    const ids = fixtureWorkflowOptions.map(o => o.id)
    expect(ids).toContain('correction')
    expect(ids).toContain('records-request')
  })

  it('property data has verified status', () => {
    expect(fixtureProperty.dataStatus).toBe('verified')
  })

  it('violations are all alleged (not stated as facts)', () => {
    for (const v of fixtureViolations) {
      expect(v.status).toBe('alleged')
    }
  })
})

// ─── Type conformance ────────────────────────────────────────────────────────

describe('View model type conformance', () => {
  it('fixtureCase conforms to CaseViewModel', () => {
    const _typed: CaseViewModel = fixtureCase
    expect(_typed).toBeDefined()
  })

  it('fixtureOverview conforms to OverviewViewModel', () => {
    const _typed: OverviewViewModel = fixtureOverview
    expect(_typed).toBeDefined()
  })

  it('fixtureTimeline items conform to TimelineEventViewModel', () => {
    const _typed: TimelineEventViewModel[] = fixtureTimeline
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureEvidence items conform to EvidenceViewModel', () => {
    const _typed: EvidenceViewModel[] = fixtureEvidence
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureFindings conform to FindingViewModel', () => {
    const _typed: FindingViewModel[] = fixtureFindings
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureViolations conform to ViolationViewModel', () => {
    const _typed: ViolationViewModel[] = fixtureViolations
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureProperty conforms to PropertyViewModel', () => {
    const _typed: PropertyViewModel = fixtureProperty
    expect(_typed).toBeDefined()
  })

  it('fixtureActions conform to ActionViewModel', () => {
    const _typed: ActionViewModel[] = fixtureActions
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureWorkflowProgress conforms to WorkflowProgressViewModel', () => {
    const _typed: WorkflowProgressViewModel = fixtureWorkflowProgress
    expect(_typed).toBeDefined()
  })

  it('fixtureWorkflowOptions conform to WorkflowOptionViewModel', () => {
    const _typed: WorkflowOptionViewModel[] = fixtureWorkflowOptions
    expect(_typed.length).toBeGreaterThan(0)
  })

  it('fixtureReview conforms to HighConsequenceReviewViewModel', () => {
    const _typed: HighConsequenceReviewViewModel = fixtureReview
    expect(_typed).toBeDefined()
  })

  it('fixtureSidebar conforms to SidebarItemViewModel', () => {
    const _typed: SidebarItemViewModel[] = fixtureSidebar
    expect(_typed.length).toBe(9)
  })
})

// ─── Fixture isolation ───────────────────────────────────────────────────────

describe('Fixture isolation', () => {
  it('fixture case has a non-production case ID prefix', () => {
    expect(fixtureCase.caseId).toContain('mck')
  })

  it('communications are empty (no fake sent documents)', () => {
    expect(fixtureCommunications.length).toBe(0)
  })

  it('property data does not fabricate unverified fields', () => {
    // All fields should be either verified or clearly from assessor
    expect(fixtureProperty.dataStatus).not.toBe('not_searched')
  })

  it('violations use "alleged" status, not stated as facts', () => {
    for (const v of fixtureViolations) {
      expect(v.status).toBe('alleged')
      expect(v.allegation).toBeDefined()
    }
  })
})
