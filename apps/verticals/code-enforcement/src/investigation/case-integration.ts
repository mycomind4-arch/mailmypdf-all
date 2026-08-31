/**
 * Case Integration Layer
 *
 * Maps code-enforcement's NoticeExtraction output into ruthlessinvestigator's
 * canonical evidence model (Evidence, Claim, Source), runs the contradiction
 * engine, and converts contradictions back to FindingViewModel[].
 *
 * Per the blueprint: ruthlessinvestigator's evidence graph is canonical.
 * code-enforcement syncs summaries back via discrepancy-engine findings.
 */

import type { NoticeExtraction } from '../domain/notice-extraction'
import type { FindingViewModel } from '../ui/types/view-models'
import type {
  InvestigationState,
  Evidence,
  Claim,
  InvestigationSource,
  Contradiction,
} from './types'
import { runContradictionAnalysis } from './contradiction-engine'
import { buildEvidenceGraph as buildInvestigationGraph } from './evidence-graph'
import type { EvidenceGraph as InvEvidenceGraph } from './types'

let idSeq = 0
function id(prefix: string): string {
  return `${prefix}-${++idSeq}`
}

/**
 * Build an investigation state from a notice extraction.
 * Creates claims for each key extracted fact, evidence from the document text,
 * and sources from the document itself.
 */
export function buildInvestigationFromNotice(
  extraction: NoticeExtraction,
  documentId: string,
): InvestigationState {
  const claims = new Map<string, Claim>()
  const evidence = new Map<string, Evidence>()
  const sources = new Map<string, InvestigationSource>()

  // Primary source: the uploaded document
  const sourceId = id('src')
  sources.set(sourceId, {
    id: sourceId,
    title: `Notice document: ${documentId}`,
    sourceType: 'GOVERNMENT_RECORD',
    quality: {
      authority: 0.8,
      proximity: 0.9,
      specificity: 0.7,
      independence: 0.8,
      transparency: 0.6,
      recency: 0.8,
      trackRecord: 0.7,
    },
    citedBy: [],
    cites: [],
    isPrimary: true,
    addedBy: 'extraction-pipeline',
    addedAt: Date.now(),
  })

  // Create claims from extracted fields that have values
  const fieldClaims: Array<{ text: string; type: Claim['type']; value?: string }> = [
    { text: 'The notice identifies a specific property address', type: 'FACTUAL', value: extraction.propertyAddress.value },
    { text: 'The notice is issued by a government agency', type: 'ATTRIBUTION', value: extraction.agency.value },
    { text: 'The notice specifies a case number', type: 'FACTUAL', value: extraction.caseNumber.value },
    { text: 'The notice alleges specific violations', type: 'FACTUAL', value: (extraction.allegedViolations.value || []).join('; ') },
    { text: 'The notice cites specific code sections', type: 'FACTUAL', value: (extraction.codeReferences.value || []).join('; ') },
    { text: 'The notice specifies a response deadline', type: 'TEMPORAL', value: extraction.responseDeadline.value },
    { text: 'The notice was served on a specific date', type: 'TEMPORAL', value: extraction.serviceDate.value },
    { text: 'The notice requests property inspection', type: 'FACTUAL', value: extraction.requestedScope.value?.join('; ') },
    { text: 'The notice describes consequences of non-response', type: 'FACTUAL', value: extraction.consequencesOfNonResponse.value },
    { text: 'The notice provides appeal information', type: 'FACTUAL', value: extraction.appealInformation.value },
    { text: 'The notice provides hearing/review rights', type: 'FACTUAL', value: extraction.hearingReviewRights.value },
    { text: 'The notice identifies the recipient by name', type: 'ATTRIBUTION', value: extraction.recipient.value },
  ]

  for (const fc of fieldClaims) {
    if (!fc.value) continue

    const claimId = id('claim')
    const evidenceId = id('ev')

    // Create evidence item for this claim
    evidence.set(evidenceId, {
      id: evidenceId,
      text: `${fc.text}: ${fc.value}`,
      type: 'DOCUMENTED_EVENT',
      sourceId,
      extractedBy: 'extraction-pipeline',
      extractedAt: Date.now(),
      supportsClaimId: claimId,
      independentConfirmation: false,
      rootSourceIds: [sourceId],
    })

    // Create the claim
    claims.set(claimId, {
      id: claimId,
      text: fc.text,
      type: fc.type,
      supportingEvidence: [evidenceId],
      contradictingEvidence: [],
      status: 'UNVERIFIED',
      createdBy: 'extraction-pipeline',
      createdAt: Date.now(),
    })
  }

  return {
    id: id('inv'),
    question: `Investigate notice ${extraction.caseNumber.value || documentId} for discrepancies and due-process violations`,
    phase: 'EVIDENCE_ANALYSIS',
    hypotheses: new Map(),
    claims,
    evidence,
    sources,
    contradictions: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Run contradiction analysis on the investigation state and convert
 * results to FindingViewModel[] for the case workspace.
 */
export function runInvestigationFindings(
  state: InvestigationState,
): { findings: FindingViewModel[]; contradictions: Contradiction[]; graph: InvEvidenceGraph } {
  // Run contradiction detection + resolution
  const contradictions = runContradictionAnalysis(state.claims, state.evidence)
  
  // Store contradictions in state
  for (const c of contradictions) {
    state.contradictions.set(c.id, c)
  }

  // Build the investigation evidence graph
  const graph = buildInvestigationGraph(state)

  // Convert contradictions to FindingViewModel[]
  const findings: FindingViewModel[] = contradictions.map((c, i) => ({
    id: `inv-finding-${String(i + 1).padStart(3, '0')}`,
    type: 'investigation_contradiction',
    title: c.status === 'CONFIRMED' ? 'Confirmed Contradiction' : c.status === 'EXPLAINED' ? 'Explained Contradiction' : 'Potential Contradiction',
    severity: c.status === 'CONFIRMED' ? 'high' : c.status === 'POTENTIAL' ? 'medium' : 'low',
    status: 'open',
    description: c.description,
    whatThisMeans: c.resolution || 'Contradiction detected between claims in the evidence. Requires investigation to determine if this indicates a factual error or document defect.',
    evidence: [c.claimA, c.claimB],
    sources: [],
    humanReviewRequired: c.status === 'CONFIRMED',
    recommendedAction: c.status === 'CONFIRMED' ? 'Review the conflicting claims and determine which is accurate. This contradiction may support a defense strategy.' : undefined,
  }))

  return { findings, contradictions, graph }
}

/**
 * Add evidence to an existing investigation state
 */
export function addEvidenceToInvestigation(
  state: InvestigationState,
  text: string,
  sourceTitle: string,
  evidenceType: Evidence['type'] = 'DOCUMENTED_EVENT',
): void {
  const sourceId = id('src')
  state.sources.set(sourceId, {
    id: sourceId,
    title: sourceTitle,
    sourceType: evidenceType,
    quality: {
      authority: 0.5,
      proximity: 0.7,
      specificity: 0.6,
      independence: 0.5,
      transparency: 0.5,
      recency: 0.7,
      trackRecord: 0.5,
    },
    citedBy: [],
    cites: [],
    isPrimary: false,
    addedBy: 'user-upload',
    addedAt: Date.now(),
  })

  const evidenceId = id('ev')
  state.evidence.set(evidenceId, {
    id: evidenceId,
    text,
    type: evidenceType,
    sourceId,
    extractedBy: 'user-upload',
    extractedAt: Date.now(),
    independentConfirmation: true,
    rootSourceIds: [sourceId],
  })

  state.updatedAt = Date.now()
}

/**
 * Get the investigation graph for visualization
 */
export function getInvestigationGraph(state: InvestigationState): InvEvidenceGraph {
  return buildInvestigationGraph(state)
}
