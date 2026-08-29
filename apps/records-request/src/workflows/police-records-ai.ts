import { runMultiLlm, type LlmProvider, type MultiLlmPolicy } from '../ai/multi-llm-orchestrator'
import type { PoliceProductionRecord } from './police-records-analysis'

export type PoliceClassification = { category: string; rationale: string }
export type PoliceIncidentFacts = { incidentNumbers: string[]; arrestNumbers: string[]; dates: string[]; locations: string[]; people: string[]; vehicles: string[]; mediaReferences: string[] }
export type PoliceContradiction = { contradictory: boolean; explanation: string; fields: string[] }
export type PoliceFollowUpStrategy = { action: 'request-follow-up' | 'seek-search-details' | 'seek-redaction-basis' | 'narrow-scope' | 'no-action'; rationale: string }

export function classifyPoliceRecord(providers: readonly LlmProvider[], record: PoliceProductionRecord, policy: MultiLlmPolicy) {
  return runMultiLlm<PoliceClassification>(providers, 'classification', { filename: record.filename, category: record.category ?? '', text: record.text ?? '' }, policy)
}

export function extractPoliceIncidentFacts(providers: readonly LlmProvider[], record: PoliceProductionRecord, policy: MultiLlmPolicy) {
  return runMultiLlm<PoliceIncidentFacts>(providers, 'extraction', { filename: record.filename, text: record.text ?? '' }, policy)
}

export function assessPoliceContradiction(providers: readonly LlmProvider[], left: PoliceProductionRecord, right: PoliceProductionRecord, policy: MultiLlmPolicy) {
  return runMultiLlm<PoliceContradiction>(providers, 'contradiction', { left: { id:left.id, text:left.text ?? '' }, right: { id:right.id, text:right.text ?? '' } }, policy)
}

export function recommendPoliceFollowUp(providers: readonly LlmProvider[], analysis: unknown, policy: MultiLlmPolicy) {
  return runMultiLlm<PoliceFollowUpStrategy>(providers, 'strategy', { workflow:'police-records', analysis }, policy)
}
