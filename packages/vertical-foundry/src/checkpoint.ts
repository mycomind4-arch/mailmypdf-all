export interface FoundryCheckpoint { runId: string; stage: string; state: Record<string, unknown>; createdAt: string }

export function createCheckpoint(runId: string, stage: string, state: Record<string, unknown>): FoundryCheckpoint {
  return { runId, stage, state, createdAt: new Date().toISOString() }
}
