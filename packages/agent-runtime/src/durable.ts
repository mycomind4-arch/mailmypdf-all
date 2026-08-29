import type { AgentResult, AgentTask } from './index.js'

export type DurableRunStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'

export interface DurableRun {
  id: string
  status: DurableRunStatus
  createdAt: string
  updatedAt: string
  taskIds: string[]
  checkpoint?: string
  error?: string
}

export interface RunCheckpoint {
  runId: string
  sequence: number
  createdAt: string
  state: unknown
  completedTaskIds: string[]
}

export interface DurableExecutionOptions {
  runId: string
  idempotencyKey: string
  maxAttempts?: number
  signal?: AbortSignal
}

/**
 * Platform-owned boundary for durable agent execution.
 *
 * Implementations may be backed by Trigger.dev, Temporal, or another durable
 * workflow engine. Domain packages must depend on this contract rather than
 * importing a workflow vendor directly.
 */
export interface DurableAgentExecutor {
  start(tasks: readonly AgentTask[], options: DurableExecutionOptions): Promise<DurableRun>
  resume(runId: string, options?: { signal?: AbortSignal }): Promise<DurableRun>
  pause(runId: string, reason: string): Promise<DurableRun>
  cancel(runId: string, reason?: string): Promise<DurableRun>
  getRun(runId: string): Promise<DurableRun | undefined>
  getCheckpoint(runId: string): Promise<RunCheckpoint | undefined>
  checkpoint(checkpoint: RunCheckpoint): Promise<void>
  executeTask<I, O>(runId: string, task: AgentTask<I>): Promise<AgentResult<O>>
}

export function createDurableRun(id: string, tasks: readonly AgentTask[], now = new Date()): DurableRun {
  if (!id) throw new Error('Durable run requires an id')
  if (tasks.length === 0) throw new Error('Durable run requires at least one task')

  const timestamp = now.toISOString()
  return {
    id,
    status: 'QUEUED',
    createdAt: timestamp,
    updatedAt: timestamp,
    taskIds: tasks.map((task) => task.id),
  }
}
