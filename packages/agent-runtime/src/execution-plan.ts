export type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface RuntimeTask { id: string; role: string; objective: string; modelClass: string }
export interface RuntimeResult { taskId: string; status: ExecutionStatus; output?: unknown; error?: string }

export interface AgentRuntimeAdapter {
  execute(task: RuntimeTask): Promise<RuntimeResult>
}

export async function executePlan(tasks: readonly RuntimeTask[], runtime: AgentRuntimeAdapter): Promise<RuntimeResult[]> {
  const results: RuntimeResult[] = []
  for (const task of tasks) {
    const result = await runtime.execute(task)
    results.push(result)
    if (result.status === 'FAILED') break
  }
  return results
}
