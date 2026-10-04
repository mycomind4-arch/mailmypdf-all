import type { ToolDefinition, ToolRegistry } from './tools.js'

export interface ActionRequest<I = unknown> {
  tool: string
  ownerId: string
  actorId: string
  caseId: string
  runId: string
  connectionId: string
  idempotencyKey: string
  input: I
}
export interface ActionReview {
  tool: string
  version: number
  ownerId: string
  actorId: string
  caseId: string
  runId: string
  connectionId: string
  idempotencyKey: string
  requestSha256: string
  requiresApproval: boolean
  effect: NonNullable<ToolDefinition['actionPolicy']>['effect']
}
export interface ActionApproval {
  id: string
  ownerId: string
  approvedBy: string
  requestSha256: string
  approvedAt: string
  expiresAt: string
  status: 'approved' | 'revoked'
}
export interface ActionAuthorization {
  /** Must check authenticated actor, owned case, and owner-bound provider connection. */
  authorize(request: Readonly<ActionRequest>): Promise<{ scopes: readonly string[] }>
  /** Load from trusted storage. Never accept an approval supplied by a tool caller. */
  loadApproval(ownerId: string, approvalId: string): Promise<ActionApproval | undefined>
}
export type ActionState = 'running' | 'succeeded' | 'failed' | 'needs_review'
export interface ActionRecord {
  review: ActionReview
  state: ActionState
  revision: number
  startedAt: string
  updatedAt: string
  approvalId?: string
  output?: unknown
  errorCode?: string
}
export interface ActionExecutionStore {
  /** Atomic unique key (ownerId, idempotencyKey); return the winner of concurrent claims. */
  claim(record: ActionRecord): Promise<{ created: boolean; record: ActionRecord }>
  /** Optimistic update; cannot change the owner/key/fingerprint identity. */
  finish(record: ActionRecord, expectedRevision: number): Promise<void>
  loadOwned(ownerId: string, key: string): Promise<ActionRecord | undefined>
}

/** Tests/development only. Hosts must inject a durable atomic store in production. */
export class MemoryActionExecutionStore implements ActionExecutionStore {
  private readonly records = new Map<string, ActionRecord>()
  private key(owner: string, key: string): string { return JSON.stringify([owner, key]) }
  async claim(record: ActionRecord) {
    const key = this.key(record.review.ownerId, record.review.idempotencyKey)
    const existing = this.records.get(key)
    if (existing) return { created: false, record: structuredClone(existing) }
    this.records.set(key, structuredClone(record))
    return { created: true, record: structuredClone(record) }
  }
  async finish(record: ActionRecord, expectedRevision: number): Promise<void> {
    const key = this.key(record.review.ownerId, record.review.idempotencyKey)
    const existing = this.records.get(key)
    if (!existing || existing.revision !== expectedRevision || existing.state !== 'running'
      || record.revision !== expectedRevision + 1 || record.state === 'running'
      || existing.review.requestSha256 !== record.review.requestSha256
      || JSON.stringify(existing.review) !== JSON.stringify(record.review)
      || existing.approvalId !== record.approvalId || existing.startedAt !== record.startedAt) {
      throw new Error('ACTION_STORE_CONFLICT')
    }
    this.records.set(key, structuredClone(record))
  }
  async loadOwned(ownerId: string, key: string): Promise<ActionRecord | undefined> {
    const record = this.records.get(this.key(ownerId, key))
    return record ? structuredClone(record) : undefined
  }
}

/** Deterministic, bounded JSON. Reject lossy values so review and execution cannot diverge. */
export function canonicalActionJson(value: unknown, depth = 0): string {
  if (depth > 30) throw new Error('ACTION_INPUT_TOO_DEEP')
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error('ACTION_INPUT_NOT_JSON')
    return `[${value.map((item) => canonicalActionJson(item, depth + 1)).join(',')}]`
  }
  if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) throw new Error('ACTION_INPUT_NOT_JSON')
    const entries = Object.keys(value).sort().map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!('value' in descriptor)) throw new Error('ACTION_INPUT_NOT_JSON')
      return `${JSON.stringify(key)}:${canonicalActionJson(descriptor.value, depth + 1)}`
    })
    return `{${entries.join(',')}}`
  }
  throw new Error('ACTION_INPUT_NOT_JSON')
}
export async function actionSha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalActionJson(value)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class GovernedActionExecutor {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly store: ActionExecutionStore,
    private readonly authorization: ActionAuthorization,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async prepare(request: ActionRequest): Promise<{ tool: ToolDefinition; review: ActionReview; input: unknown }> {
    for (const value of [request.tool, request.ownerId, request.actorId, request.caseId, request.runId, request.connectionId, request.idempotencyKey]) {
      if (typeof value !== 'string' || !value.trim() || value.length > 256) throw new Error('ACTION_IDENTITY_REQUIRED')
    }
    const tool = this.registry.get(request.tool)
    const policy = tool?.actionPolicy
    if (!tool || !policy || !Number.isSafeInteger(policy.version) || policy.version < 1
      || !policy.provider.trim() || !Number.isSafeInteger(policy.maxInputBytes) || policy.maxInputBytes < 1) {
      throw new Error('ACTION_POLICY_REQUIRED')
    }
    if (policy.effect !== 'none' && !tool.requiresApproval) throw new Error('ACTION_EFFECT_REQUIRES_APPROVAL')
    const json = canonicalActionJson(request.input)
    if (new TextEncoder().encode(json).byteLength > policy.maxInputBytes) throw new Error('ACTION_INPUT_TOO_LARGE')
    const snapshot = JSON.parse(json) as unknown
    const identity = {
      tool: tool.name, version: policy.version, ownerId: request.ownerId, actorId: request.actorId,
      caseId: request.caseId, runId: request.runId, connectionId: request.connectionId,
      idempotencyKey: request.idempotencyKey, requiresApproval: tool.requiresApproval, effect: policy.effect,
    }
    const requestSha256 = await actionSha256({ ...identity, provider: policy.provider, scopes: [...policy.scopes].sort(), input: snapshot })
    return { tool, review: { ...identity, requestSha256 }, input: snapshot }
  }

  /** Side-effect-free review fingerprint for storage in the existing human-review boundary. */
  async review(request: ActionRequest): Promise<ActionReview> {
    const prepared = await this.prepare(request)
    await this.authorize({ ...request, input: prepared.input }, prepared.tool)
    return prepared.review
  }

  private async authorize(request: ActionRequest, tool: ToolDefinition): Promise<void> {
    const authorization = await this.authorization.authorize(request)
    if (tool.actionPolicy!.scopes.some((scope) => !authorization.scopes.includes(scope))) throw new Error('ACTION_SCOPE_DENIED')
  }

  async invoke(request: ActionRequest, options: { approvalId?: string; signal?: AbortSignal } = {}): Promise<ActionRecord> {
    // Snapshot before awaits: caller mutation cannot change the reviewed input mid-flight.
    const stableRequest = { ...request }
    const { tool, review, input } = await this.prepare(stableRequest)
    stableRequest.input = input
    await this.authorize(stableRequest, tool)
    if (options.signal?.aborted) throw new Error('ACTION_ABORTED')
    if (review.requiresApproval) {
      const approval = options.approvalId
        ? await this.authorization.loadApproval(review.ownerId, options.approvalId) : undefined
      const now = this.now()
      if (!approval || approval.id !== options.approvalId || approval.status !== 'approved'
        || approval.ownerId !== review.ownerId || approval.approvedBy !== review.actorId
        || approval.requestSha256 !== review.requestSha256
        || !Number.isFinite(Date.parse(approval.approvedAt)) || Date.parse(approval.approvedAt) > now.getTime()
        || !Number.isFinite(Date.parse(approval.expiresAt)) || Date.parse(approval.expiresAt) <= now.getTime()) {
        throw new Error('ACTION_APPROVAL_REQUIRED')
      }
    }
    if (options.signal?.aborted) throw new Error('ACTION_ABORTED')
    const timestamp = this.now().toISOString()
    const pending: ActionRecord = {
      review, state: 'running', revision: 1, startedAt: timestamp, updatedAt: timestamp,
      ...(review.requiresApproval ? { approvalId: options.approvalId } : {}),
    }
    const claim = await this.store.claim(pending)
    if (claim.record.review.ownerId !== review.ownerId || claim.record.review.idempotencyKey !== review.idempotencyKey
      || claim.record.review.requestSha256 !== review.requestSha256) throw new Error('ACTION_IDEMPOTENCY_CONFLICT')
    if (!claim.created) return claim.record
    // Once claimed, all uncertainty remains visible. Never blindly retry an external write.
    let completed: ActionRecord
    try {
      if (options.signal?.aborted) throw new Error('ACTION_ABORTED')
      const output = await tool.execute(input, {
        runId: review.runId, caseId: review.caseId, actorId: review.actorId, ownerId: review.ownerId,
        connectionId: review.connectionId, idempotencyKey: review.idempotencyKey, signal: options.signal,
      })
      completed = { ...pending, state: 'succeeded', revision: 2, updatedAt: this.now().toISOString(), output }
    } catch {
      completed = {
        ...pending, state: review.effect === 'none' ? 'failed' : 'needs_review', revision: 2,
        updatedAt: this.now().toISOString(), errorCode: review.effect === 'none' ? 'ACTION_PROVIDER_FAILED' : 'ACTION_OUTCOME_UNCERTAIN',
      }
    }
    // Store failures propagate. The surviving running claim prevents repeating the provider effect.
    await this.store.finish(completed, 1)
    return structuredClone(completed)
  }
}
