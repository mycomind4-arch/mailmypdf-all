import type { ModelClass } from './model-routing.js'
import type { AgentRole, VerticalCandidate } from './foundry-contract.js'

export interface AgentTask { id:string; role:AgentRole; candidate:VerticalCandidate; objective:string; modelClass:ModelClass }
export interface AgentExecution { taskId:string; status:'PASS'|'FAIL'|'BLOCKED'; score:number; evidence:string[]; blockers:string[] }
export interface AgentRuntimeAdapter { execute(task:AgentTask):Promise<AgentExecution> }

const models:Record<AgentRole,ModelClass> = {
  'market-researcher':'REASONING','competition-analyst':'REASONING','product-strategist':'REASONING','ux-architect':'VISION','vertical-architect':'REASONING','builder':'CODE','security-qa':'REASONING','ux-qa':'VISION','domain-qa':'REASONING','evidence-qa':'REASONING','red-team':'REASONING','release-judge':'REASONING'
}
export function makeTask(candidate:VerticalCandidate, role:AgentRole, objective:string):AgentTask {
  return { id:`${candidate.id}:${role}`, role, candidate, objective, modelClass:models[role] }
}
