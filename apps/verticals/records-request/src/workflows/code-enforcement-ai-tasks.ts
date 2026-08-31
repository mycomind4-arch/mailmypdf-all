import type { LlmTask } from '../ai/multi-llm'

export type CodeEnforcementAiInput = {
  recordId: string
  filename: string
  text: string
  knownIdentifiers?: {
    propertyAddress?: string
    apn?: string
    caseNumber?: string
    citationNumber?: string
  }
}

export type ExtractedCodeEnforcementEntities = {
  propertyAddresses: string[]
  parcelNumbers: string[]
  caseNumbers: string[]
  citationNumbers: string[]
  dates: string[]
  people: string[]
  agencies: string[]
  recordReferences: string[]
}

export type CodeEnforcementClassification = {
  categories: string[]
  confidence: number
  rationale: string
}

export type CodeEnforcementContradiction = {
  field: string
  values: string[]
  recordIds: string[]
  explanation: string
}

export const entityExtractionTask = (input: CodeEnforcementAiInput): LlmTask<CodeEnforcementAiInput, ExtractedCodeEnforcementEntities> => ({
  id: 'code-enforcement.entity-extraction.v1',
  input,
  outputSchema: 'Extract only source-supported entities; return empty arrays when absent.',
  metadata: { domain: 'code-enforcement-records', taskVersion: '1' },
})

export const classificationTask = (input: CodeEnforcementAiInput): LlmTask<CodeEnforcementAiInput, CodeEnforcementClassification> => ({
  id: 'code-enforcement.classification.v1',
  input,
  outputSchema: 'Classify the record into applicable code-enforcement record categories with source-grounded rationale.',
  metadata: { domain: 'code-enforcement-records', taskVersion: '1' },
})

export const contradictionTask = (input: CodeEnforcementAiInput): LlmTask<CodeEnforcementAiInput, CodeEnforcementContradiction[]> => ({
  id: 'code-enforcement.contradiction.v1',
  input,
  outputSchema: 'Identify only contradictions supported by the supplied record text and identifiers.',
  metadata: { domain: 'code-enforcement-records', taskVersion: '1' },
})
