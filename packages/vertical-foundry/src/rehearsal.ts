import { executePlan, type AgentRuntimeAdapter, type RuntimeTask } from '@mailmypdf/agent-runtime'
import { DryRunAgentRuntime } from './provider-adapters.js'

export interface RehearsalResult { succeeded: boolean; results: Awaited<ReturnType<typeof executePlan>> }

export async function rehearse(tasks: readonly RuntimeTask[], runtime: AgentRuntimeAdapter = new DryRunAgentRuntime()): Promise<RehearsalResult> {
  const results = await executePlan(tasks, runtime)
  return { succeeded: results.length === tasks.length && results.every((result) => result.status === 'SUCCEEDED'), results }
}
