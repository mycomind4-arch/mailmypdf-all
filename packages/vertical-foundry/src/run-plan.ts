import type { AgentRole, FoundryStage, VerticalCandidate } from './foundry-contract.js'
import { makeTask, type AgentTask } from './agent-runtime-adapter.js'

const rolesByStage:Record<FoundryStage,AgentRole[]> = {
  RESEARCH:['market-researcher','competition-analyst'], SELECT:['product-strategist'], SPECIFY:['product-strategist','ux-architect','vertical-architect'], BUILD:['vertical-architect','builder'], QA:['security-qa','ux-qa','domain-qa','evidence-qa'], RED_TEAM:['red-team'], VERIFY:['release-judge'], DEPLOY:['release-judge'], REGISTER:['release-judge']
}
export function planStage(candidate:VerticalCandidate,stage:FoundryStage):AgentTask[] {
  return (rolesByStage[stage] ?? []).map(role=>makeTask(candidate,role,`Complete ${stage} gate for ${candidate.name}`))
}
