import { canAdvance, requiresHumanApproval, type AgentRole, type FoundryRun, type FoundryStage, type GateStatus, type QualityGate } from './foundry-contract.js'

export interface OrchestratorState { run: FoundryRun; currentStage: FoundryStage; status: 'RUNNABLE' | 'BLOCKED' | 'HUMAN_REVIEW' | 'COMPLETE' }

export interface StageResult { stage: FoundryStage; score: number; blockers?: string[]; status?: GateStatus; reviewer: AgentRole }

export function createFoundryRun(runId: string, candidateId: string): FoundryRun {
  return { runId, candidateId, stages: ['RESEARCH','SELECT','SPECIFY','BUILD','QA','RED_TEAM','VERIFY','DEPLOY','REGISTER'], gates: [], humanApprovalRequired: false }
}

export function applyStageResult(run: FoundryRun, result: StageResult): OrchestratorState {
  const gate: QualityGate = { stage: result.stage, status: result.status ?? 'PASS', score: result.score, blockers: result.blockers ?? [], reviewer: result.reviewer }
  const gates = [...run.gates.filter((existing) => existing.stage !== result.stage), gate]
  const updated: FoundryRun = { ...run, gates, humanApprovalRequired: gates.some((item) => requiresHumanApproval(item.stage) && canAdvance(item)) }
  if (!canAdvance(gate)) return { run: updated, currentStage: result.stage, status: gate.status === 'HUMAN_REVIEW' ? 'HUMAN_REVIEW' : 'BLOCKED' }
  const index = updated.stages.indexOf(result.stage)
  const next = updated.stages[index + 1]
  if (!next) return { run: updated, currentStage: result.stage, status: 'COMPLETE' }
  if (requiresHumanApproval(next)) return { run: updated, currentStage: next, status: 'HUMAN_REVIEW' }
  return { run: updated, currentStage: next, status: 'RUNNABLE' }
}
