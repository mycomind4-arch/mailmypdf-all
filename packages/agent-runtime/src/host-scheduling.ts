export type HostTaskKind =
  | 'workflow_resume'
  | 'deadline_scan'
  | 'notification_delivery'
  | 'provider_reconciliation'
  | 'maintenance'
  | 'custom'

export interface HostTaskInput {
  kind: HostTaskKind
  dedupeKey: string
  payload: unknown
  ownerId?: string
  matterId?: string
  workflowId?: string
}

export interface ScheduleHostTaskInput extends HostTaskInput {
  runAt: string
}

export interface ScheduledHostTask extends HostTaskInput {
  id: string
  runAt: string
  createdAt: string
  status: 'scheduled' | 'cancelled'
}

export interface QueuedHostTask extends HostTaskInput {
  id: string
  enqueuedAt: string
  status: 'queued'
}

export interface HostTaskScheduler {
  /**
   * Schedule one future execution. Implementations must treat dedupeKey as
   * idempotent within their persistence boundary.
   */
  schedule(input: ScheduleHostTaskInput): Promise<ScheduledHostTask>
  cancel(id: string): Promise<ScheduledHostTask>
  get(id: string): Promise<ScheduledHostTask | undefined>
}

export interface HostTaskQueue {
  /**
   * Enqueue work for execution as soon as the host can accept it.
   * Implementations must treat dedupeKey as idempotent.
   */
  enqueue(input: HostTaskInput): Promise<QueuedHostTask>
  get(id: string): Promise<QueuedHostTask | undefined>
}

function requireText(value: string | undefined, label: string): string {
  const normalized = value?.trim() ?? ''
  if (!normalized) throw new Error(`Host task requires ${label}.`)
  return normalized
}

function normalizeTask<T extends HostTaskInput>(input: T): T {
  return {
    ...input,
    dedupeKey: requireText(input.dedupeKey, 'dedupeKey'),
    ownerId: input.ownerId?.trim() || undefined,
    matterId: input.matterId?.trim() || undefined,
    workflowId: input.workflowId?.trim() || undefined,
  }
}

export function validateScheduledRunAt(runAt: string): string {
  const value = requireText(runAt, 'runAt')
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error('Host task runAt must be a valid date.')
  return new Date(parsed).toISOString()
}

/**
 * Test/dev scheduler only. Production hosts should provide a durable adapter
 * backed by Trigger.dev, Temporal, a cloud queue, or equivalent infrastructure.
 */
export class MemoryHostTaskScheduler implements HostTaskScheduler {
  private readonly byId = new Map<string, ScheduledHostTask>()
  private readonly byDedupeKey = new Map<string, string>()

  async schedule(input: ScheduleHostTaskInput): Promise<ScheduledHostTask> {
    const normalized = normalizeTask(input)
    const priorId = this.byDedupeKey.get(normalized.dedupeKey)
    if (priorId) {
      const prior = this.byId.get(priorId)
      if (prior) return prior
    }

    const task: ScheduledHostTask = Object.freeze({
      ...normalized,
      id: crypto.randomUUID(),
      runAt: validateScheduledRunAt(normalized.runAt),
      createdAt: new Date().toISOString(),
      status: 'scheduled',
    })
    this.byId.set(task.id, task)
    this.byDedupeKey.set(task.dedupeKey, task.id)
    return task
  }

  async cancel(id: string): Promise<ScheduledHostTask> {
    const current = this.byId.get(id)
    if (!current) throw new Error(`Scheduled host task not found: ${id}`)
    if (current.status === 'cancelled') return current
    const cancelled = Object.freeze({ ...current, status: 'cancelled' as const })
    this.byId.set(id, cancelled)
    return cancelled
  }

  async get(id: string): Promise<ScheduledHostTask | undefined> {
    return this.byId.get(id)
  }
}

/**
 * Test/dev queue only. Production implementations must persist idempotency
 * before handing work to a provider.
 */
export class MemoryHostTaskQueue implements HostTaskQueue {
  private readonly byId = new Map<string, QueuedHostTask>()
  private readonly byDedupeKey = new Map<string, string>()

  async enqueue(input: HostTaskInput): Promise<QueuedHostTask> {
    const normalized = normalizeTask(input)
    const priorId = this.byDedupeKey.get(normalized.dedupeKey)
    if (priorId) {
      const prior = this.byId.get(priorId)
      if (prior) return prior
    }

    const task: QueuedHostTask = Object.freeze({
      ...normalized,
      id: crypto.randomUUID(),
      enqueuedAt: new Date().toISOString(),
      status: 'queued',
    })
    this.byId.set(task.id, task)
    this.byDedupeKey.set(task.dedupeKey, task.id)
    return task
  }

  async get(id: string): Promise<QueuedHostTask | undefined> {
    return this.byId.get(id)
  }
}
