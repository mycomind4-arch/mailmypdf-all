/**
 * Case Store — Zustand
 *
 * Orchestrates the full case pipeline:
 * Phase 1: Upload → classify → extract → jurisdiction → authority → scope → discrepancy → reconcile → strategies → evidence graph
 * Phase 2: Investigation integration (ruthlessinvestigator contradiction detection)
 * Phase 3: Due-process analysis (fairprocessmaps analyzer ported to TypeScript)
 * Phase 4: Records-request gap-filling (prefill builder + production analysis)
 * Phase 5: Defense pipeline (strategy → draft → critique → certify → review → deliver)
 */

import { create } from 'zustand'
import {
  classifyDocument,
} from '../domain/document-classification'
import {
  extractNotice,
  type NoticeExtraction,
} from '../domain/notice-extraction'
import {
  identifyJurisdiction,
} from '../domain/jurisdiction'
import {
  analyzeAuthority,
} from '../domain/authority-analysis'
import {
  analyzeScope,
} from '../domain/scope-analysis'
import {
  runDiscrepancyEngine,
  type DiscrepancyReport,
} from '../domain/discrepancy-engine'
import {
  reconcileAll,
} from '../domain/reconciliation'
import {
  generateCorrectionStrategies,
} from '../domain/correction-strategy'
import {
  buildEvidenceGraph,
  type EvidenceGraph,
} from '../domain/evidence-graph'

import {
  toCaseViewModel,
  toTimelineEvents,
  toEvidenceItems,
  toFindings,
  toViolations,
  toProperty,
  toSidebarItems,
} from '../adapters/domain-adapters'

import {
  buildInvestigationFromNotice,
  runInvestigationFindings,
  addEvidenceToInvestigation,
} from '../investigation/case-integration'
import type { InvestigationState } from '../investigation/types'

import {
  DueProcessAnalyzer,
  type DueProcessTimelineEvent,
  type DueProcessEvidenceItem,
} from '../due-process/analyzer'
import type { UnifiedFinding } from '../findings/taxonomy'
import { findingVMToUnified, discrepancyToUnified } from '../findings/converter'

import {
  isGapFinding,
  buildRecordsRequestPrefill,
  type RecordsRequestPrefill,
  type RecordsRequestResult,
} from '../records-requests/integration'

import {
  runDefensePipeline,
  type DefensePipelineResult,
} from '../pipeline/defense-pipeline'

import type {
  CaseViewModel,
  TimelineEventViewModel,
  EvidenceViewModel,
  FindingViewModel,
  ViolationViewModel,
  PropertyViewModel,
  SidebarItemViewModel,
} from '../ui/types/view-models'

// ─── Store Types ────────────────────────────────────────────────────────────

export interface CaseStoreState {
  // Pipeline status
  status: 'idle' | 'extracting' | 'analyzing' | 'ready' | 'error'
  error: string | null

  // Raw inputs
  documentText: string | null
  documentName: string | null

  // Domain outputs
  extraction: NoticeExtraction | null
  discrepancyReport: DiscrepancyReport | null
  evidenceGraph: EvidenceGraph | null
  investigationState: InvestigationState | null

  // Phase 3: Due-process
  dueProcessScore: number | null
  dueProcessRecommendations: string[]

  // Phase 4: Records requests
  recordsRequest: RecordsRequestPrefill | null
  recordsResults: RecordsRequestResult | null

  // Phase 5: Defense pipeline
  defenseResult: DefensePipelineResult | null

  // Unified findings (all engines, for pipeline consumption)
  unifiedFindings: UnifiedFinding[]

  // View models (derived from domain outputs, for UI)
  caseVM: CaseViewModel | null
  timelineEvents: TimelineEventViewModel[]
  evidenceItems: EvidenceViewModel[]
  findings: FindingViewModel[]
  violations: ViolationViewModel[]
  property: PropertyViewModel | null
  sidebarItems: SidebarItemViewModel[]

  // Actions
  processDocument: (text: string, documentName: string) => void
  addEvidence: (text: string, sourceLabel: string) => void
  requestMissingRecords: () => void
  buildDefense: () => void
  reset: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDueProcessTimeline(extraction: NoticeExtraction): DueProcessTimelineEvent[] {
  const events: DueProcessTimelineEvent[] = []
  if (extraction.noticeDate?.value) {
    events.push({
      id: 'ev-notice',
      eventType: 'notice',
      eventDate: new Date(extraction.noticeDate.value),
      receivingParty: extraction.recipient?.value || 'property owner',
    })
  }
  if (extraction.responseDeadline?.value) {
    events.push({
      id: 'ev-deadline',
      eventType: 'decision',
      eventDate: new Date(extraction.responseDeadline.value),
      receivingParty: extraction.recipient?.value || 'property owner',
    })
  }
  if (extraction.inspectionDate?.value) {
    events.push({
      id: 'ev-inspection',
      eventType: 'hearing',
      eventDate: new Date(extraction.inspectionDate.value),
      receivingParty: extraction.recipient?.value || 'property owner',
    })
  }
  return events
}

function unifiedToVM(f: UnifiedFinding): FindingViewModel {
  return {
    id: f.id,
    type: f.type,
    title: f.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    severity: f.severity as FindingViewModel['severity'],
    status: f.unresolved ? 'open' : 'resolved',
    description: f.statement,
    whatThisMeans: f.recommendedAction,
    evidence: f.supportingFacts,
    sources: f.source === 'due-process' ? ['due-process-analyzer'] : [f.source],
    recommendedAction: f.recommendedAction,
    humanReviewRequired: f.severity === 'critical',
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCaseStore = create<CaseStoreState>((set, get) => ({
  status: 'idle',
  error: null,
  documentText: null,
  documentName: null,
  extraction: null,
  discrepancyReport: null,
  evidenceGraph: null,
  investigationState: null,
  dueProcessScore: null,
  dueProcessRecommendations: [],
  recordsRequest: null,
  recordsResults: null,
  defenseResult: null,
  unifiedFindings: [],
  caseVM: null,
  timelineEvents: [],
  evidenceItems: [],
  findings: [],
  violations: [],
  property: null,
  sidebarItems: toSidebarItems(0, 0, 0),

  processDocument: (text: string, documentName: string) => {
    try {
      set({ status: 'analyzing' })

      // ── Phase 1: Domain pipeline ──────────────────────────────────
      classifyDocument(documentName, text)
      const extraction = extractNotice(text, documentName)
      const jurisdiction = identifyJurisdiction({
        locationName: extraction.jurisdiction.value || undefined,
        agencyName: extraction.agency.value || undefined,
        noticeText: text,
      })
      analyzeAuthority({
        consentWording: extraction.consentWording,
        warrantWording: extraction.warrantWording,
        consequencesOfNonResponse: extraction.consequencesOfNonResponse,
        consequencesOfRefusal: extraction.consequencesOfRefusal,
        inspectionAuthority: extraction.inspectionAuthority,
        codeReferences: extraction.codeReferences,
        statutoryReferences: extraction.statutoryReferences,
      })
      analyzeScope({
        requestedScope: extraction.requestedScope,
        searchInspectionWording: extraction.searchInspectionWording,
        consentWording: extraction.consentWording,
      })
      const discrepancyReport = runDiscrepancyEngine({
        recipientName: extraction.recipient.value,
        recordOwner: extraction.propertyOwner.value,
        noticeAddress: extraction.propertyAddress.value,
        noticeApn: extraction.apn.value,
        hasComplaintNumber: !!extraction.complaintNumber.value,
        hasCaseNumber: !!extraction.caseNumber.value,
        hasNoticeDate: !!extraction.noticeDate.value,
        hasServiceDate: !!extraction.serviceDate.value,
        hasDeadline: !!extraction.responseDeadline.value,
        hasInspectionAuthority: !!extraction.inspectionAuthority.value,
        hasConsentWording: !!extraction.consentWording.value,
        hasWarrantWording: !!extraction.warrantWording.value,
      })
      const reconciliation = reconcileAll({ extraction })
      const strategyReport = generateCorrectionStrategies(reconciliation.allIssues)
      const evidenceGraph = buildEvidenceGraph({
        noticeSummary: `Notice from ${extraction.agency.value || 'agency'}`,
        allegations: extraction.allegedViolations.value || [],
        codeSections: extraction.codeReferences.value || [],
        propertyAddress: extraction.propertyAddress.value,
        findings: discrepancyReport.discrepancies.map(d => ({
          label: d.type,
          description: d.rationale,
          factCategory: 'inference' as const,
          source: 'discrepancy-engine',
        })),
        strategies: strategyReport.strategies.map(s => s.title),
      })

      // ── Phase 2: Investigation (ruthlessinvestigator) ──────────────
      const investigationState = buildInvestigationFromNotice(extraction, documentName)
      const { findings: investigationFindingsVM } = runInvestigationFindings(investigationState)

      // ── Phase 3: Due-process analysis (fairprocessmaps port) ───────
      const dueProcessAnalyzer = new DueProcessAnalyzer()
      const dpTimeline = buildDueProcessTimeline(extraction)
      const dpEvidence: DueProcessEvidenceItem[] = [{
        id: documentName,
        ocrText: text,
        propertyId: extraction.apn?.value || extraction.propertyAddress?.value,
      }]
      const dueProcessReport = dueProcessAnalyzer.analyze(dpEvidence, dpTimeline)
      const dueProcessFindings = dueProcessAnalyzer.toFindings(dueProcessReport)

      // ── Merge all findings into unified taxonomy ────────────────────
      const discrepancyUnified = discrepancyReport.discrepancies.map(discrepancyToUnified)
      const investigationUnified = investigationFindingsVM.map(vm => findingVMToUnified(vm, 'investigation'))
      const allUnifiedFindings: UnifiedFinding[] = [
        ...discrepancyUnified,
        ...investigationUnified,
        ...dueProcessFindings,
      ]

      // ── Phase 4: Auto-build records request if gap findings exist ──
      const gapFindings = allUnifiedFindings.filter(isGapFinding)
      let recordsRequest: RecordsRequestPrefill | null = null
      if (gapFindings.length > 0 && extraction.propertyAddress?.value) {
        recordsRequest = buildRecordsRequestPrefill({
          agencyName: extraction.agency?.value || undefined,
          jurisdiction: jurisdiction ? (jurisdiction.municipality || jurisdiction.county || jurisdiction.state) : undefined,
          propertyAddress: extraction.propertyAddress.value,
          apn: extraction.apn?.value || undefined,
          caseNumber: extraction.caseNumber?.value || undefined,
          recipientName: extraction.recipient?.value || undefined,
          noticeDate: extraction.noticeDate?.value || undefined,
          deadlineDate: extraction.responseDeadline?.value || undefined,
          gapFindings,
        })
      }

      // ── View models ────────────────────────────────────────────────
      const discrepancyFindingsVM = toFindings(discrepancyReport, reconciliation)
      const unifiedFindingsVM = allUnifiedFindings.map(unifiedToVM)
      const allFindingsVM = [...discrepancyFindingsVM, ...unifiedFindingsVM]

      const caseVM = toCaseViewModel(extraction, jurisdiction, extraction.responseDeadline.value || undefined)
      const timelineEventsVM = toTimelineEvents(extraction)
      const evidenceItems = toEvidenceItems(extraction, documentName)
      const violations = toViolations(extraction)
      const property = toProperty(extraction)
      const sidebarItems = toSidebarItems(evidenceItems.length, allFindingsVM.length, violations.length)

      set({
        status: 'ready',
        documentText: text,
        documentName,
        extraction,
        discrepancyReport,
        evidenceGraph,
        investigationState,
        dueProcessScore: dueProcessReport.overallScore,
        dueProcessRecommendations: dueProcessReport.recommendations,
        recordsRequest,
        unifiedFindings: allUnifiedFindings,
        caseVM,
        timelineEvents: timelineEventsVM,
        evidenceItems,
        findings: allFindingsVM,
        violations,
        property,
        sidebarItems,
        error: null,
      })

      // ── Persist pipeline results to Base44 (durable storage) ───
      // Replaces the previous browser-only state with backend persistence.
      saveCaseToBackend(get()).catch((saveErr) => {
        console.error('[case-store] Failed to persist case to backend:', saveErr)
      })
    } catch (err) {
      console.error('[case-store] Pipeline error:', err)
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error during analysis',
      })
    }
  },

  addEvidence: (text: string, sourceLabel: string) => {
    const state = get()
    if (!state.investigationState) return

    addEvidenceToInvestigation(state.investigationState, text, sourceLabel)
    const { findings: investigationFindingsVM } = runInvestigationFindings(state.investigationState)

    // Re-run due-process with updated evidence
    const dueProcessAnalyzer = new DueProcessAnalyzer()
    const dpTimeline = state.extraction ? buildDueProcessTimeline(state.extraction) : []
    const dpEvidence: DueProcessEvidenceItem[] = [
      { id: state.documentName || 'doc', ocrText: state.documentText || '' },
      { id: sourceLabel, ocrText: text },
    ]
    const dpReport = dueProcessAnalyzer.analyze(dpEvidence, dpTimeline)
    const dpFindings = dueProcessAnalyzer.toFindings(dpReport)

    // Rebuild unified findings
    const discrepancyUnified = state.discrepancyReport?.discrepancies.map(discrepancyToUnified) || []
    const investigationUnified = investigationFindingsVM.map(vm => findingVMToUnified(vm, 'investigation'))
    const allUnified = [...discrepancyUnified, ...investigationUnified, ...dpFindings]

    // Rebuild VM findings
    const discrepancyFindingsVM = state.discrepancyReport
      ? toFindings(state.discrepancyReport)
      : []
    const unifiedFindingsVM = allUnified.map(unifiedToVM)

    set({
      unifiedFindings: allUnified,
      dueProcessScore: dpReport.overallScore,
      dueProcessRecommendations: dpReport.recommendations,
      findings: [...discrepancyFindingsVM, ...unifiedFindingsVM],
      sidebarItems: toSidebarItems(
        state.evidenceItems.length,
        discrepancyFindingsVM.length + unifiedFindingsVM.length,
        state.violations.length,
      ),
    })
  },

  requestMissingRecords: () => {
    const state = get()
    if (!state.extraction) return

    const gapFindings = state.unifiedFindings.filter(isGapFinding)
    const prefill = buildRecordsRequestPrefill({
      agencyName: state.extraction.agency?.value || undefined,
      jurisdiction: state.caseVM?.jurisdiction,
      propertyAddress: state.extraction.propertyAddress?.value || undefined,
      apn: state.extraction.apn?.value || undefined,
      caseNumber: state.extraction.caseNumber?.value || undefined,
      recipientName: state.extraction.recipient?.value || undefined,
      noticeDate: state.extraction.noticeDate?.value || undefined,
      deadlineDate: state.extraction.responseDeadline?.value || undefined,
      gapFindings,
    })
    prefill.status = 'submitted'
    set({ recordsRequest: prefill })
  },

  buildDefense: () => {
    const state = get()
    if (!state.extraction || !state.discrepancyReport) return

    const result = runDefensePipeline({
      extraction: state.extraction,
      discrepancies: state.discrepancyReport.discrepancies,
      findings: state.unifiedFindings,
      jurisdictionName: state.caseVM?.jurisdiction,
      recordsFindings: state.recordsResults?.findings,
      propertyReconciled: !!state.property,
    })
    set({ defenseResult: result })
  },

  reset: () => {
    set({
      status: 'idle',
      error: null,
      documentText: null,
      documentName: null,
      extraction: null,
      discrepancyReport: null,
      evidenceGraph: null,
      investigationState: null,
      dueProcessScore: null,
      dueProcessRecommendations: [],
      recordsRequest: null,
      recordsResults: null,
      defenseResult: null,
      unifiedFindings: [],
      caseVM: null,
      timelineEvents: [],
      evidenceItems: [],
      findings: [],
      violations: [],
      property: null,
      sidebarItems: toSidebarItems(0, 0, 0),
    })
  },
}))

// ─── Durable Persistence ─────────────────────────────────────────────────────
// The store now persists pipeline results to Base44 after analysis completes,
// replacing the previous browser-only state.

export async function saveCaseToBackend(state: CaseStoreState): Promise<{ ok: boolean; caseId?: string; error?: string }> {
  if (!state.documentName || !state.documentText) {
    return { ok: false, error: 'No document to save.' }
  }

  const extraction = state.extraction
  const findings = state.unifiedFindings

  const payload = {
    documentName: state.documentName,
    documentText: state.documentText,
    caseNumber: extraction?.caseNumber?.value || null,
    complaintNumber: extraction?.complaintNumber?.value || null,
    propertyAddress: extraction?.propertyAddress?.value || null,
    apn: extraction?.apn?.value || null,
    recipientName: extraction?.recipient?.value || null,
    agencyName: extraction?.agency?.value || null,
    noticeDate: extraction?.noticeDate?.value || null,
    responseDeadline: extraction?.responseDeadline?.value || null,
    jurisdiction: extraction?.jurisdiction?.value || null,
    status: 'analyzed',
    findingsCount: findings.length,
    findingsSummary: findings.slice(0, 5).map(f => f.statement).join('; '),
    defenseReady: findings.length > 0 && !findings.some(f => f.severity === 'critical' && f.unresolved),
    goldCertified: false,
    blockingIssues: findings.filter(f => f.severity === 'critical' && f.unresolved).map(f => f.statement),
    dueProcessScore: state.dueProcessScore,
    reviewNotified: false,
    findings: findings.map(f => ({
      type: f.type,
      severity: f.severity,
      description: f.statement,
      source: f.source,
      resolved: !f.unresolved,
      confidence: 'high' as const,
      recommendedAction: f.recommendedAction,
    })),
  }

  try {
    const res = await fetch('/api/cases/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || 'Save failed.' }
    }

    const data = await res.json()
    return { ok: true, caseId: data.case?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error.' }
  }
}
