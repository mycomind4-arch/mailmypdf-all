import { describe, expect, it, vi } from 'vitest'
import type { LlmProvider, LlmTask } from '../ai/multi-llm-orchestrator'

const completeTask = (provider: 'gemini' | 'openai', task: LlmTask) => {
  const shared = { provider, model: `test-${provider}`, confidence: 0.95, warnings: [] as string[] }
  if (task === 'classification') return { ...shared, value: { category: 'inspection', rationale: 'Inspection report matches the inspection category.' } }
  if (task === 'extraction') return { ...shared, value: { caseNumbers: ['CE-2026-10'], parcelNumbers: ['APN-123'], addresses: ['123 Main St'], dates: ['2026-08-01'], people: [] } }
  if (task === 'contradiction') return { ...shared, value: { contradictory: false, explanation: 'No contradiction identified.' } }
  return { ...shared, value: { likelyCustodians: ['Code Enforcement Department'], searchTerms: ['123 Main St', 'code enforcement case file'], scopeGaps: [], overbreadthRisks: [], identifiersToConfirm: ['case number', 'parcel/APN'], followUpPriorities: ['missing inspection records'] } }
}

const testProviders: LlmProvider[] = (['gemini', 'openai'] as const).map((provider) => ({
  id: `test-${provider}`,
  async complete<T>(task: LlmTask) { return completeTask(provider, task) as { provider:string; model:string; confidence:number; warnings:string[]; value:T } },
}))

vi.mock('../ai/records-llm-providers', () => ({ getConfiguredRecordsLlmProviders: () => testProviders }))

import { buildCodeEnforcementRequest, codeEnforcementRecordsWorkflow } from './code-enforcement-records'

describe('code enforcement workflow integration', () => {
  it('builds a complete identifier-rich request', () => {
    const request = buildCodeEnforcementRequest({ agency: 'Example City', department: 'Code Enforcement', propertyAddress: '123 Main St', parcelNumber: 'APN-123', caseNumber: 'CE-2026-10', violationNumber: 'V-22', relatedParty: 'Example LLC', dateStart: '2024-01-01', dateEnd: '2026-08-24', subjectMatter: 'unpermitted construction and property maintenance violations' })
    expect(request.items).toHaveLength(10)
    expect(request.items.every((item) => item.dateStart === '2024-01-01' && item.dateEnd === '2026-08-24')).toBe(true)
    expect(request.items.every((item) => item.description.includes('123 Main St'))).toBe(true)
    expect(request.items.every((item) => item.description.includes('CE-2026-10'))).toBe(true)
  })

  it('rejects a request that lacks a property or case identifier', () => {
    const request = buildCodeEnforcementRequest({ agency: 'Example City', dateStart: '2024-01-01', dateEnd: '2026-08-24', subjectMatter: 'code issue' })
    const issues = codeEnforcementRecordsWorkflow.validateRequest(request as never)
    expect(issues.some((issue) => issue.field === 'identifiers')).toBe(true)
  })

  it('runs production analysis through classification, extraction, contradiction, and strategy', async () => {
    const request = buildCodeEnforcementRequest({ agency: 'Example City', propertyAddress: '123 Main St', dateStart: '2024-01-01', dateEnd: '2026-08-24', subjectMatter: 'code violation' })
    const result = await codeEnforcementRecordsWorkflow.responseAnalysis!.analyze({
      requestedItems: request.items,
      records: [
        { id: 'r1', filename: 'inspection-report.pdf', category: 'inspection', text: 'Inspection report for 123 Main St, case CE-2026-10, APN-123.' },
        { id: 'r2', filename: 'notice.pdf', category: 'notices-and-orders', text: 'Notice for 123 Main St, case CE-2026-10, APN-123.' },
      ],
    }) as { recordsReviewed: number; findings: unknown[]; aiProvenance: { providers: string[]; agreement: number }; aiRecordAnalysis: unknown[]; aiContradictions: unknown[] }
    expect(result.recordsReviewed).toBe(2)
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.aiProvenance.providers).toEqual(['gemini', 'openai'])
    expect(result.aiProvenance.agreement).toBeGreaterThanOrEqual(0.94)
    expect(result.aiRecordAnalysis).toHaveLength(2)
    expect(result.aiContradictions).toHaveLength(0)
  })
})
