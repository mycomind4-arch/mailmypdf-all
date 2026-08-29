import type { RuntimeResult, RuntimeTask } from '@mailmypdf/agent-runtime'

export interface FoundryRunRecord { id: string; verticalId: string; stage: string; tasks: RuntimeTask[]; results: RuntimeResult[] }

export function recordRuntimeResults(run: FoundryRunRecord, results: RuntimeResult[]): FoundryRunRecord {
  const failed = results.some((result) => result.status === 'FAILED')
  return { ...run, results: [...run.results, ...results], stage: failed ? 'BLOCKED' : run.stage }
}
