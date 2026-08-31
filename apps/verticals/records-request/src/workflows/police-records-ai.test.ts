import { describe, expect, it } from 'vitest'
import type { LlmProvider } from '../ai/multi-llm-orchestrator'
import { assessPoliceContradiction, classifyPoliceRecord, extractPoliceIncidentFacts, recommendPoliceFollowUp } from './police-records-ai'

const policy = { minimumProviders:2, agreementThreshold:0.66, maxProviders:3 }
function provider(id:string, value:unknown):LlmProvider { return { id, complete:async <T>()=>({ provider:id, model:`${id}-model`, value:value as T, confidence:0.9, warnings:[] }) } }

describe('police records multi-LLM tasks', () => {
  it('classifies records with provider consensus', async () => {
    const result = await classifyPoliceRecord([provider('a',{category:'incident-report',rationale:'report'}),provider('b',{category:'incident-report',rationale:'report'})],{id:'r1',filename:'report.pdf',text:'Incident report'},policy)
    expect(result.value.category).toBe('incident-report')
    expect(result.providers).toEqual(['a','b'])
  })
  it('extracts structured incident facts', async () => {
    const result = await extractPoliceIncidentFacts([provider('a',{incidentNumbers:['2026-1'],arrestNumbers:[],dates:['2026-01-01'],locations:['1 Main St'],people:['Jane Doe'],vehicles:[],mediaReferences:[]}),provider('b',{incidentNumbers:['2026-1'],arrestNumbers:[],dates:['2026-01-01'],locations:['1 Main St'],people:['Jane Doe'],vehicles:[],mediaReferences:[]})],{id:'r1',filename:'case.pdf',text:'Case 2026-1'},policy)
    expect(result.value.incidentNumbers).toEqual(['2026-1'])
  })
  it('requires consensus for contradiction analysis', async () => {
    const result = await assessPoliceContradiction([provider('a',{contradictory:true,explanation:'dates differ',fields:['date']}),provider('b',{contradictory:true,explanation:'dates differ',fields:['date']})],{id:'a',filename:'a.pdf',text:'Jan 1'},{id:'b',filename:'b.pdf',text:'Jan 3'},policy)
    expect(result.value.contradictory).toBe(true)
  })
  it('generates follow-up strategy through multiple providers', async () => {
    const result = await recommendPoliceFollowUp([provider('a',{action:'request-follow-up',rationale:'missing CAD'}),provider('b',{action:'request-follow-up',rationale:'missing CAD'})],{missingCategoryIds:['dispatch-cad']},policy)
    expect(result.value.action).toBe('request-follow-up')
  })
})
