import { describe, expect, it } from 'vitest'
import type { LlmProvider } from '../ai/multi-llm-orchestrator'
import { assessPropertyPermitContradiction, classifyPropertyPermitRecord, extractPropertyPermitFacts, recommendPropertyPermitFollowUp } from './property-permit-records-ai'

const policy = { minimumProviders:2, agreementThreshold:0.66, maxProviders:3 }
function provider(id:string, value:unknown): LlmProvider { return { id, complete:async <T>()=>({ provider:id, model:`${id}-model`, value:value as T, confidence:0.9, warnings:[] }) } }

describe('property permit multi-LLM tasks', () => {
  it('classifies with provider consensus', async () => {
    const result = await classifyPropertyPermitRecord([provider('a',{category:'inspection-records',rationale:'inspection'}),provider('b',{category:'inspection-records',rationale:'inspection'})],{text:'inspection report'},policy)
    expect(result.value.category).toBe('inspection-records')
  })
  it('extracts structured property and permit facts', async () => {
    const result = await extractPropertyPermitFacts([provider('a',{permitNumbers:['BP-1'],parcelNumbers:['APN-1'],addresses:['1 Main St'],dates:['2026-01-01'],owners:['Jane Doe'],projectTypes:['addition'],referencedDocuments:[]}),provider('b',{permitNumbers:['BP-1'],parcelNumbers:['APN-1'],addresses:['1 Main St'],dates:['2026-01-01'],owners:['Jane Doe'],projectTypes:['addition'],referencedDocuments:[]})],{text:'BP-1 1 Main St'},policy)
    expect(result.value.permitNumbers).toEqual(['BP-1'])
  })
  it('requires consensus for contradiction review', async () => {
    const result = await assessPropertyPermitContradiction([provider('a',{contradictory:true,explanation:'permit dates differ',fields:['date']}),provider('b',{contradictory:true,explanation:'permit dates differ',fields:['date']})],{left:'2026-01-01',right:'2026-02-01'},policy)
    expect(result.value.contradictory).toBe(true)
  })
  it('produces follow-up strategy through multiple providers', async () => {
    const result = await recommendPropertyPermitFollowUp([provider('a',{action:'request-follow-up',rationale:'missing inspection records'}),provider('b',{action:'request-follow-up',rationale:'missing inspection records'})],{missingCategoryIds:['inspection-records']},policy)
    expect(result.value.action).toBe('request-follow-up')
  })
})
