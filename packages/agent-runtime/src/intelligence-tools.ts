import { canTransition, type DocumentStatus } from '@mailmypdf/documents'
import {
  computeCaseAssessment,
  computeRiskAssessment,
  detectContradictions,
  evaluateEvidence,
  type CaseAssessmentInput,
  type RiskAssessmentInput,
  type Fact,
  type EvidencePacket,
  type ProvenanceLevel,
} from '@mailmypdf/intelligence'
import type { ToolDefinition } from './tools.js'

export const documentTransitionTool: ToolDefinition<{ from: DocumentStatus; to: DocumentStatus }, { allowed: boolean }> = {
  name: 'document_transition_allowed',
  description: 'Validate a document lifecycle transition before changing document state.',
  risk: 'LOW',
  requiresApproval: false,
  reversible: true,
  idempotent: true,
  async execute(input) { return { allowed: canTransition(input.from, input.to) } },
}

export const evidenceEvaluationTool: ToolDefinition<{ packet: EvidencePacket }, ReturnType<typeof evaluateEvidence>> = {
  name: 'evaluate_evidence',
  description: 'Evaluate evidence direction, quality, contradictions, and gaps.',
  risk: 'LOW',
  requiresApproval: false,
  reversible: true,
  idempotent: true,
  async execute(input) { return evaluateEvidence(input.packet) },
}

export const contradictionDetectionTool: ToolDefinition<{ facts: readonly Fact[]; provenance: { level: ProvenanceLevel; ruleId?: string } }, ReturnType<typeof detectContradictions>> = {
  name: 'detect_contradictions',
  description: 'Detect conflicting facts using the deterministic contradiction engine.',
  risk: 'LOW',
  requiresApproval: false,
  reversible: true,
  idempotent: true,
  async execute(input) { return detectContradictions(input.facts, input.provenance) },
}

export const riskAssessmentTool: ToolDefinition<RiskAssessmentInput, ReturnType<typeof computeRiskAssessment>> = {
  name: 'compute_risk_assessment',
  description: 'Compute an explainable deterministic risk assessment from case intelligence.',
  risk: 'MEDIUM',
  requiresApproval: false,
  reversible: true,
  idempotent: true,
  async execute(input) { return computeRiskAssessment(input) },
}

export const caseAssessmentTool: ToolDefinition<CaseAssessmentInput, ReturnType<typeof computeCaseAssessment>> = {
  name: 'assess_case',
  description: 'Synthesize case intelligence into recommended actions and readiness.',
  risk: 'MEDIUM',
  requiresApproval: false,
  reversible: true,
  idempotent: true,
  async execute(input) { return computeCaseAssessment(input) },
}

export function createIntelligenceToolRegistry() {
  return [documentTransitionTool, evidenceEvaluationTool, contradictionDetectionTool, riskAssessmentTool, caseAssessmentTool] as const
}
