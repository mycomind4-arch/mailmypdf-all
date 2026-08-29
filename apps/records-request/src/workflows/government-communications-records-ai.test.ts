import { describe, expect, it } from 'vitest'
import type { LlmProvider } from '../ai/multi-llm-orchestrator'
import { classifyGovernmentCommunication, extractGovernmentCommunicationFacts, assessGovernmentCommunicationContradiction, recommendGovernmentCommunicationFollowUp } from './government-communications-records-ai'

const policy={minimumProviders:2,agreementThreshold:0.66,maxProviders:3}
function provider(id:string,value:unknown):LlmProvider{return{id,complete:async<T>()=>({provider:id,model:`${id}-model`,value:value as T,confidence:0.9,warnings:[]})}}

describe('government communications multi-LLM',()=>{
 it('classifies with provider consensus',async()=>{const r=await classifyGovernmentCommunication([provider('a',{category:'emails',rationale:'email'}),provider('b',{category:'emails',rationale:'email'})],{text:'email thread'},policy);expect(r.value.category).toBe('emails')})
 it('extracts custodians, terms, dates and thread references',async()=>{const value={custodians:['Jane Smith'],dates:['2026-01-01'],subjects:['redevelopment'],keywords:['RFP'],outsideParties:['Acme'],systems:['email'],threadIds:['t1'],referencedAttachments:['memo.pdf']};const r=await extractGovernmentCommunicationFacts([provider('a',value),provider('b',value)],{text:'sample'},policy);expect(r.value.threadIds).toEqual(['t1'])})
 it('requires consensus for contradiction analysis',async()=>{const value={contradictory:true,explanation:'dates differ',fields:['date']};const r=await assessGovernmentCommunicationContradiction([provider('a',value),provider('b',value)],{},policy);expect(r.value.contradictory).toBe(true)})
 it('produces follow-up strategy through multiple providers',async()=>{const value={action:'request-follow-up',rationale:'attachments missing'};const r=await recommendGovernmentCommunicationFollowUp([provider('a',value),provider('b',value)],{missingCategoryIds:['email-attachments']},policy);expect(r.value.action).toBe('request-follow-up')})
})
