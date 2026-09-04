export type ModelClass = 'FAST' | 'REASONING' | 'VISION' | 'CODE' | 'MULTILINGUAL' | 'EMBEDDING'
export type AgentStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked'
export interface AgentTask<I = unknown> { id: string; role: string; objective: string; modelClass: ModelClass; input: I; maxAttempts?: number }
export interface AgentResult<O = unknown> { taskId: string; status: AgentStatus; output?: O; confidence?: number; evidence?: string[]; errors?: string[]; cost?: { inputTokens: number; outputTokens: number; usd?: number } }
export interface AgentExecutor { execute<I, O>(task: AgentTask<I>): Promise<AgentResult<O>> }
export interface AgentRun { id: string; tasks: AgentTask[]; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' }
export function createAgentRun(id: string, tasks: AgentTask[]): AgentRun { if (!id || tasks.length === 0) throw new Error('Agent run requires an id and at least one task'); return { id, tasks, status: 'queued' } }
export function allSucceeded(results: readonly AgentResult[]): boolean { return results.length > 0 && results.every((result) => result.status === 'succeeded') }
export * from './execution-plan.js'
export * from './durable.js'
export * from './durable-store.js'
export * from './approval.js'
export * from './case-agent.js'
export * from './intelligence-tools.js'
export * from './tools.js'
export * from './tool-executor.js'
export * from './trigger-adapter.js'
export * from './memory.js'
export * from './model-routing.js'
export * from './telemetry.js'
export * from './fulfillment.js'
export * from './case-pipeline.js'
export * from './security.js'
export * from './green-audit.js'
export * from './production-smoke.js'
export * from './live-config.js'
export * from './live-smoke.js'
export * from './live-probes.js'
