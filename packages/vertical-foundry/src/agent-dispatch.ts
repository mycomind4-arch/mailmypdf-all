import type { AgentRole, VerticalCandidate } from './foundry-contract.js'

export interface AgentTask { role: AgentRole; candidateId: string; objective: string; modelClass: 'FAST' | 'REASONING' | 'VISION' | 'CODE' | 'MULTILINGUAL' | 'EMBEDDING' }

const MODEL_BY_ROLE: Record<AgentRole, AgentTask['modelClass']> = {
  'market-researcher': 'REASONING', 'competition-analyst': 'REASONING', 'product-strategist': 'REASONING',
  'ux-architect': 'VISION', 'vertical-architect': 'REASONING', builder: 'CODE', 'security-qa': 'REASONING',
  'ux-qa': 'VISION', 'domain-qa': 'REASONING', 'evidence-qa': 'REASONING', 'red-team': 'REASONING', 'release-judge': 'REASONING',
}

export function createAgentTasks(candidate: VerticalCandidate, roles: readonly AgentRole[]): AgentTask[] {
  return roles.map((role) => ({ role, candidateId: candidate.id, objective: `Evaluate or advance ${candidate.name} according to the ${role} responsibility`, modelClass: MODEL_BY_ROLE[role] }))
}
