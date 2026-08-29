import type { AgentRole, QualityGate, FoundryStage } from './foundry-contract.js'
import type { AgentExecution } from './agent-runtime-adapter.js'

export interface QaPolicy { minimumScore:number; requiredRoles:AgentRole[] }
export function evaluateQa(stage:FoundryStage, executions:readonly AgentExecution[], policy:QaPolicy):QualityGate {
  const relevant = executions.filter(e=>policy.requiredRoles.some(r=>e.taskId.endsWith(`:${r}`)))
  const score = relevant.length ? Math.round(relevant.reduce((s,e)=>s+e.score,0)/relevant.length) : 0
  const blockers = relevant.flatMap(e=>e.blockers)
  const failed = relevant.some(e=>e.status==='FAIL' || e.status==='BLOCKED') || score < policy.minimumScore
  return { stage, status: failed ? 'FAIL' : 'PASS', score, blockers, reviewer: policy.requiredRoles[0] ?? 'release-judge' }
}
