import { describe, expect, it } from 'vitest'
import type { LlmProvider } from '../ai/multi-llm-orchestrator'
import { assessGovernmentCommunicationContradiction, classifyGovernmentCommunication, extractGovernmentCommunicationFacts, recommendGovernmentCommunicationFollowUp } from './government-communications-ai'
const policy={minimumProviders:2,agreementThreshold:0.66,maxProviders:3}
function provider(id:string,value:unknown):LlmProvider{return{id,complete:async<T>()=>({provider:id,model:`${id}-model`,value:value as T,confidence:.9,warnings:[]})}}
describe('government communications multi-LLM',()=>{
 it('classifies with consensus',async()=>{const r=await classifyGovernmentCommunication([provider('a',{category:'emails',rationale:'email'}),provider('b',{category:'emails',rationale:'email'})],{text:'email'},policy);expect(r.value.category).toBe('emails')})
 it('extracts custodians and terms',async()=>{const r=await extractGovernmentCommunicationFacts([provider('a',{custodians:['Jane'],dates:['2026-01-01'],subjects:['project'],keywords:['zoning'],outsideParties:[],threadIds:['T1']}),provider('b',{custodians:['Jane'],dates:['2026-01-01'],subjects:['project'],keywords:['zoning'],outsideParties:[],threadIds:['T1']})],{text:'Jane zoning'},policy);expect(r.value.custodians).toEqual(['Jane'])})
 it('requires consensus for contradiction review',async()=>{const r=await assessGovernmentCommunicationContradiction([provider('a',{contradictory:true,explanation:'dates differ',fields:['date']}),provider('b',{contradictory:true,explanation:'dates differ',fields:['date']})],{left:'2026-01-01',right:'2026-01-02'},policy);expect(r.value.contradictory).toBe(true)})
 it('produces follow-up strategy',async()=>{const r=await recommendGovernmentCommunicationFollowUp([provider('a',{action:'seek-attachment',rationale:'attachment referenced'}),provider('b',{action:'seek-attachment',rationale:'attachment referenced'})],{findings:['attachment']},policy);expect(r.value.action).toBe('seek-attachment')})
})
