export type FoundryStage = 'RESEARCH' | 'SELECT' | 'SPECIFY' | 'BUILD' | 'QA' | 'RED_TEAM' | 'VERIFY' | 'DEPLOY' | 'REGISTER'
export type GateStatus = 'PASS' | 'FAIL' | 'HUMAN_REVIEW'
export type AgentRole = 'market-researcher' | 'competition-analyst' | 'product-strategist' | 'ux-architect' | 'vertical-architect' | 'builder' | 'security-qa' | 'ux-qa' | 'domain-qa' | 'evidence-qa' | 'red-team' | 'release-judge'

export interface OpportunityScore { demand:number; competition:number; differentiation:number; reuse:number; feasibility:number; risk:number; overall:number }
export interface ResearchFinding { source:string; claim:string; confidence:number; capturedAt:string }
export interface VerticalCandidate { id:string; name:string; description:string; findings:ResearchFinding[]; score:OpportunityScore }
export interface QualityGate { stage:FoundryStage; status:GateStatus; score:number; blockers:string[]; reviewer:AgentRole }
export interface FoundryRun { runId:string; candidateId:string; stages:FoundryStage[]; gates:QualityGate[]; humanApprovalRequired:boolean }

export const FOUNDry_STAGES:readonly FoundryStage[] = ['RESEARCH','SELECT','SPECIFY','BUILD','QA','RED_TEAM','VERIFY','DEPLOY','REGISTER']
export const FOUNDry_AGENTS:readonly AgentRole[] = ['market-researcher','competition-analyst','product-strategist','ux-architect','vertical-architect','builder','security-qa','ux-qa','domain-qa','evidence-qa','red-team','release-judge']

export function scoreOpportunity(input: Omit<OpportunityScore,'overall'>): OpportunityScore {
  const overall = Math.max(0, Math.min(100, Math.round((input.demand*0.25)+(input.competition*0.1)+(input.differentiation*0.2)+(input.reuse*0.2)+(input.feasibility*0.2)+(input.risk*0.05))))
  return {...input, overall}
}

export function canAdvance(gate:QualityGate):boolean { return gate.status === 'PASS' && gate.score >= 80 && gate.blockers.length === 0 }
export function requiresHumanApproval(stage:FoundryStage):boolean { return stage === 'DEPLOY' || stage === 'REGISTER' }
