import { runMultiLlm, type LlmProvider, type MultiLlmPolicy } from '../ai/multi-llm-orchestrator'
import type { GenericProductionRecord } from './generic-records-analysis'

export type GenericRecordClassification = {
  category: string
  rationale: string
}

export type GenericRecordFacts = {
  identifiers: string[]
  caseNumbers: string[]
  dates: string[]
  people: string[]
  agencies: string[]
  documentReferences: string[]
  statusTerms: string[]
}

export type GenericRecordContradiction = {
  contradictory: boolean
  explanation: string
  fields: string[]
}

export type GenericRecordFollowUpStrategy = {
  action: 'request-follow-up' | 'seek-search-details' | 'seek-redaction-basis' | 'narrow-scope' | 'clarify-custodian' | 'no-action'
  rationale: string
}

export function classifyGenericRecord(
  providers: readonly LlmProvider[],
  record: GenericProductionRecord,
  workflow: string,
  requestedCategories: readonly string[],
  policy: MultiLlmPolicy,
) {
  return runMultiLlm<GenericRecordClassification>(providers, 'classification', {
    workflow,
    requestedCategories,
    filename: record.filename,
    category: record.category ?? '',
    text: record.text ?? '',
  }, policy)
}

export function extractGenericRecordFacts(
  providers: readonly LlmProvider[],
  record: GenericProductionRecord,
  workflow: string,
  policy: MultiLlmPolicy,
) {
  return runMultiLlm<GenericRecordFacts>(providers, 'extraction', {
    workflow,
    filename: record.filename,
    category: record.category ?? '',
    text: record.text ?? '',
  }, policy)
}

export function assessGenericRecordContradiction(
  providers: readonly LlmProvider[],
  left: GenericProductionRecord,
  right: GenericProductionRecord,
  workflow: string,
  policy: MultiLlmPolicy,
) {
  return runMultiLlm<GenericRecordContradiction>(providers, 'contradiction', {
    workflow,
    left: { id: left.id, filename: left.filename, category: left.category ?? '', text: left.text ?? '' },
    right: { id: right.id, filename: right.filename, category: right.category ?? '', text: right.text ?? '' },
  }, policy)
}

export function recommendGenericRecordFollowUp(
  providers: readonly LlmProvider[],
  workflow: string,
  analysis: unknown,
  policy: MultiLlmPolicy,
) {
  return runMultiLlm<GenericRecordFollowUpStrategy>(providers, 'strategy', { workflow, analysis }, policy)
}
