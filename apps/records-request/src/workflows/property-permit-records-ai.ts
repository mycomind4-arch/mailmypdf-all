import { runMultiLlm, type LlmProvider, type MultiLlmPolicy } from '../ai/multi-llm-orchestrator'

export type PropertyPermitFacts = {
  permitNumbers: string[]
  parcelNumbers: string[]
  addresses: string[]
  dates: string[]
  owners: string[]
  projectTypes: string[]
  referencedDocuments: string[]
}

export type PropertyPermitClassification = { category:string; rationale:string }
export type PropertyPermitContradiction = { contradictory:boolean; explanation:string; fields:string[] }
export type PropertyPermitStrategy = { action:'request-follow-up'|'seek-search-details'|'seek-redaction-basis'|'narrow-scope'|'no-action'; rationale:string }

export function classifyPropertyPermitRecord(providers: readonly LlmProvider[], input: unknown, policy: MultiLlmPolicy) {
  return runMultiLlm<PropertyPermitClassification>(providers,'classification',input,policy)
}

export function extractPropertyPermitFacts(providers: readonly LlmProvider[], input: unknown, policy: MultiLlmPolicy) {
  return runMultiLlm<PropertyPermitFacts>(providers,'extraction',input,policy)
}

export function assessPropertyPermitContradiction(providers: readonly LlmProvider[], input: unknown, policy: MultiLlmPolicy) {
  return runMultiLlm<PropertyPermitContradiction>(providers,'contradiction',input,policy)
}

export function recommendPropertyPermitFollowUp(providers: readonly LlmProvider[], analysis: unknown, policy: MultiLlmPolicy) {
  return runMultiLlm<PropertyPermitStrategy>(providers,'strategy',{ workflow:'property-permit-records', analysis },policy)
}
