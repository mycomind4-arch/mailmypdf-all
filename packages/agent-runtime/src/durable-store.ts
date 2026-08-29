import type { DurableRun, RunCheckpoint } from './durable.js'

/**
 * Persistence boundary for durable agent runs.
 * Production adapters may target D1, Postgres, Trigger.dev metadata, or
 * another durable store without leaking storage details into the runtime.
 */
export interface DurableRunStore {
  createRun(run: DurableRun): Promise<void>
  getRun(runId: string): Promise<DurableRun | undefined>
  updateRun(run: DurableRun): Promise<void>
  putCheckpoint(checkpoint: RunCheckpoint): Promise<void>
  getCheckpoint(runId: string): Promise<RunCheckpoint | undefined>
}

export class MemoryDurableRunStore implements DurableRunStore {
  private readonly runs = new Map<string, DurableRun>()
  private readonly checkpoints = new Map<string, RunCheckpoint>()

  async createRun(run: DurableRun): Promise<void> {
    if (this.runs.has(run.id)) throw new Error(`Durable run already exists: ${run.id}`)
    this.runs.set(run.id, structuredClone(run))
  }

  async getRun(runId: string): Promise<DurableRun | undefined> {
    const run = this.runs.get(runId)
    return run ? structuredClone(run) : undefined
  }

  async updateRun(run: DurableRun): Promise<void> {
    if (!this.runs.has(run.id)) throw new Error(`Durable run not found: ${run.id}`)
    this.runs.set(run.id, structuredClone(run))
  }

  async putCheckpoint(checkpoint: RunCheckpoint): Promise<void> {
    const current = this.checkpoints.get(checkpoint.runId)
    if (current && checkpoint.sequence <= current.sequence) return
    this.checkpoints.set(checkpoint.runId, structuredClone(checkpoint))
  }

  async getCheckpoint(runId: string): Promise<RunCheckpoint | undefined> {
    const checkpoint = this.checkpoints.get(runId)
    return checkpoint ? structuredClone(checkpoint) : undefined
  }
}

export function createDurableRunStore(): DurableRunStore {
  return new MemoryDurableRunStore()
}
