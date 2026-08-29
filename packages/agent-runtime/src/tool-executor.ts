import type { ToolContext, ToolDefinition, ToolInvocation, ToolRegistry } from './tools.js'

export interface ToolExecutionRecord<O = unknown> {
  invocation: ToolInvocation
  tool: string
  startedAt: string
  completedAt: string
  status: 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
  output?: O
  error?: string
}

export interface ToolApproval {
  invocationKey: string
  approved: boolean
  approvedBy?: string
  approvedAt?: string
}

export interface ToolExecutionStore {
  get(invocationKey: string): Promise<ToolExecutionRecord | undefined>
  put(record: ToolExecutionRecord): Promise<void>
}

export class InMemoryToolExecutionStore implements ToolExecutionStore {
  private readonly records = new Map<string, ToolExecutionRecord>()
  async get(invocationKey: string): Promise<ToolExecutionRecord | undefined> { return this.records.get(invocationKey) }
  async put(record: ToolExecutionRecord): Promise<void> { this.records.set(record.invocation.idempotencyKey, record) }
}

export class GovernedToolExecutor {
  constructor(private readonly registry: ToolRegistry, private readonly store: ToolExecutionStore = new InMemoryToolExecutionStore()) {}

  async invoke<I, O>(invocation: ToolInvocation<I>, input: I, options: { approved?: boolean; actorId?: string; signal?: AbortSignal } = {}): Promise<ToolExecutionRecord<O>> {
    const existing = await this.store.get(invocation.idempotencyKey)
    if (existing) return existing as ToolExecutionRecord<O>

    const tool = this.registry.assertCanInvoke(invocation.tool, options.approved === true) as ToolDefinition<I, O>
    const startedAt = new Date().toISOString()
    const context: ToolContext = { runId: invocation.runId, caseId: invocation.caseId, actorId: options.actorId, signal: options.signal }

    try {
      const output = await tool.execute(input, context)
      const record: ToolExecutionRecord<O> = { invocation, tool: tool.name, startedAt, completedAt: new Date().toISOString(), status: 'SUCCEEDED', output }
      await this.store.put(record)
      return record
    } catch (error) {
      const record: ToolExecutionRecord = { invocation, tool: tool.name, startedAt, completedAt: new Date().toISOString(), status: 'FAILED', error: error instanceof Error ? error.message : String(error) }
      await this.store.put(record)
      return record as ToolExecutionRecord<O>
    }
  }
}
