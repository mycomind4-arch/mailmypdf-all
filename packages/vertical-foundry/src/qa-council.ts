import type {FoundryStage, QualityGate, AgentRole} from './foundry-contract.js'
export interface QACheck { stage:Extract<FoundryStage,'QA'|'RED_TEAM'|'VERIFY'>; reviewer:AgentRole; score:number; blockers:string[] }
export function evaluateQACouncil(checks:readonly QACheck[]):QualityGate { const blockers=checks.flatMap(c=>c.blockers); const score=checks.length?Math.round(checks.reduce((s,c)=>s+c.score,0)/checks.length):0; const failed=checks.some(c=>c.score<80||c.blockers.length>0); return {stage:'VERIFY',status:failed?'FAIL':'PASS',score,blockers,reviewer:'release-judge'} }
