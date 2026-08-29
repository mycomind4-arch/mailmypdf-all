import type { AgentResult, AgentTask } from './index.js'
import { createDurableRun, type DurableAgentExecutor, type DurableExecutionOptions, type DurableRun, type RunCheckpoint } from './durable.js'

export interface TriggerTaskHandle {
  id: string
}

export interface TriggerTaskClient {
  trigger(taskId: string, payload: unknown, options?: { idempotencyKey?: string }): Promise<TriggerTaskHandle>
}

export interface TriggerRunStore {
  saveRun(run: DurableRun): Promise<void>
  loadRun(runId: string): Promise<DurableRun | undefined>
  saveCheckpoint(checkpoint: RunCheckpoint): Promise<void>
  loadCheckpoint(runId: string): Promise<RunCheckpoint | undefined>
}

/**
 * Vendor-neutral adapter shape for Trigger.dev.
 *
 * The actual @trigger.dev/sdk dependency belongs in the application/deployment
 * package. Keeping this package dependent only on the small client/store
 * contracts prevents Trigger-specific types from leaking into the platform.
 */
export class TriggerDurableExecutor implements DurableAgentExecutor {
  constructor(
    private readonly client: TriggerTaskClient,
    private readonly store: TriggerRunStore,
    private readonly executeLocal: <I, O>(task: AgentTask<I>, runId: string) => Promise<AgentResult<O>>,
  ) {}

  async start(tasks: readonly AgentTask[], options: DurableExecutionOptions): Promise<DurableRun> {
    const run = createDurableRun(options.runId, tasks)
    await this.store.saveRun(run)

    await Promise.all(
      tasks.map((task) =>
        this.client.trigger(task.id, { runId: run.id, task }, { idempotencyKey: `${options.idempotencyKey}:${task.id}` }),
      ),
    )

    return { ...run, status: 'RUNNING', updatedAt: new Date().toISOString() }
  }

  async resume(runId: string): Promise<DurableRun> {
    const run = await this.store.loadRun(runId)
    if (!run) throw new Error(`Durable run not found: ${runId}`)
    if (run.status !== 'PAUSED') return run
    return { ...run, status: 'RUNNING', updatedAt: new Date().toISOString() }
  }

  async pause(runId: string, reason: string): Promise<DurableRun> {
    const run = await this.store.loadRun(runId)
    if (!run) throw new Error(`Durable run not found: ${runId}`)
    const paused = { ...run, status: 'PAUSED' as const, error: reason, updatedAt: new Date().toISOString() }
    await this.store.saveRun(paused)
    return paused
  }

  async cancel(runId: string, reason = 'Cancelled'): Promise<DurableRun> {
    const run = await this.store.loadRun(runId)
    if (!run) throw new Error(`Durable run not found: ${runId}`)
    const cancelled = { ...run, status: 'CANCELLED' as const, error: reason, updatedAt: new Date().toISOString() }
    await this.store.saveRun(cancelled)
    return cancelled
  }

  getRun(runId: string): Promise<DurableRun | undefined> {
    return this.store.loadRun(runId)
  }

  getCheckpoint(runId: string): Promise<RunCheckpoint | undefined> {
    return this.store.loadCheckpoint(runId)
  }

  checkpoint(checkpoint: RunCheckpoint): Promise<void> {
    return this.store.saveCheckpoint(checkpoint)
  }

  executeTask<I, O>(runId: string, task: AgentTask<I>): Promise<AgentResult<O>> {
    return this.executeLocal(task, runId)
  }
}
