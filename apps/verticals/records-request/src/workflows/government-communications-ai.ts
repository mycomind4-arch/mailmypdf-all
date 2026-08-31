import { runMultiLlm, type LlmProvider, type MultiLlmPolicy } from '../ai/multi-llm-orchestrator'
export type GovernmentCommunicationFacts={custodians:string[];dates:string[];subjects:string[];keywords:string[];outsideParties:string[];threadIds:string[]}
export type GovernmentCommunicationClassification={category:string;rationale:string}
export type GovernmentCommunicationContradiction={contradictory:boolean;explanation:string;fields:string[]}
export type GovernmentCommunicationStrategy={action:'request-follow-up'|'seek-search-details'|'seek-attachment'|'seek-redaction-basis'|'narrow-scope'|'no-action';rationale:string}
export function classifyGovernmentCommunication(providers:readonly LlmProvider[],input:unknown,policy:MultiLlmPolicy){return runMultiLlm<GovernmentCommunicationClassification>(providers,'classification',input,policy)}
export function extractGovernmentCommunicationFacts(providers:readonly LlmProvider[],input:unknown,policy:MultiLlmPolicy){return runMultiLlm<GovernmentCommunicationFacts>(providers,'extraction',input,policy)}
export function assessGovernmentCommunicationContradiction(providers:readonly LlmProvider[],input:unknown,policy:MultiLlmPolicy){return runMultiLlm<GovernmentCommunicationContradiction>(providers,'contradiction',input,policy)}
export function recommendGovernmentCommunicationFollowUp(providers:readonly LlmProvider[],analysis:unknown,policy:MultiLlmPolicy){return runMultiLlm<GovernmentCommunicationStrategy>(providers,'strategy',{workflow:'government-communications-records',analysis},policy)}
