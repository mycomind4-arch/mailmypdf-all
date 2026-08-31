import type { RequestRepository, ValidatedRequest } from './request-service'
import { computeAuditEventHash } from './audit-chain'
import type { ApprovedArtifact } from './approved-artifact'

export type RequestState = 'draft' | 'validated' | 'review' | 'approved' | 'queued' | 'submitted' | 'tracking' | 'completed' | 'failed'

export type RequestRecord = {
  id: string
  title: string
  agency: string
  jurisdiction?: string
  purpose?: string
  scope?: string
  status: RequestState
  ownerId?: string
  approvedArtifactJson?: string
  approvedArtifactHash?: string
  approvedAt?: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export type RequestStateRepository = RequestRepository & {
  getRequest(id: string): Promise<RequestRecord | null>
  listRequests(ownerId?: string): Promise<RequestRecord[]>
  transition(id: string, from: RequestState, to: RequestState, actor: string): Promise<RequestRecord>
  setApprovedArtifact(id: string, artifact: ApprovedArtifact, hash: string, actor: string): Promise<RequestRecord>
  recordAuditEvent(input: { requestId: string; eventType: string; actor: string; payload: Record<string, unknown> }): Promise<void>
  recordFulfillmentEvent(input: { requestId: string; eventType: string; actor: string; payload: Record<string, unknown> }): Promise<void>
  recordProviderWebhookEvent(input: { requestId: string; eventId: string; status: string; actor: string; payload: Record<string, unknown> }): Promise<boolean>
  verifyAuditChain(requestId: string): Promise<{ valid: boolean; checked: number; error?: string }>
}

export type D1Result<T = unknown> = { results?: T[]; success?: boolean; meta?: { changes?: number } }
export type D1Statement = { bind(...values: unknown[]): D1Statement; first<T = unknown>(): Promise<T | null>; all<T = unknown>(): Promise<D1Result<T>>; run(): Promise<D1Result> }
export type D1DatabaseLike = { prepare(sql: string): D1Statement; batch?: (statements: D1Statement[]) => Promise<D1Result[]> }

const allowedTransitions: Record<RequestState, readonly RequestState[]> = {
  draft: ['validated'], validated: ['review'], review: ['approved'], approved: ['queued'], queued: ['submitted', 'failed'],
  submitted: ['tracking', 'failed'], tracking: ['completed', 'failed'], completed: [], failed: [],
}

const toRecord = (row: Record<string, unknown>): RequestRecord => ({
  id: String(row.id), title: String(row.title), agency: String(row.agency),
  jurisdiction: row.jurisdiction ? String(row.jurisdiction) : undefined,
  purpose: row.purpose ? String(row.purpose) : undefined, scope: row.scope_json ? String(row.scope_json) : undefined,
  status: String(row.status) as RequestState, ownerId: row.owner_id ? String(row.owner_id) : undefined,
  approvedArtifactJson: row.approved_artifact_json ? String(row.approved_artifact_json) : undefined,
  approvedArtifactHash: row.approved_artifact_hash ? String(row.approved_artifact_hash) : undefined,
  approvedAt: row.approved_at ? String(row.approved_at) : undefined,
  approvedBy: row.approved_by ? String(row.approved_by) : undefined,
  createdAt: String(row.created_at), updatedAt: String(row.updated_at),
})

export function canTransition(from: RequestState, to: RequestState): boolean { return allowedTransitions[from].includes(to) }

async function currentAuditTail(db: D1DatabaseLike, requestId: string): Promise<string | null> {
  const row = await db.prepare(`SELECT audit_tail_hash FROM requests WHERE id = ?`).bind(requestId).first<{ audit_tail_hash: string | null }>()
  if (row?.audit_tail_hash) return row.audit_tail_hash
  const legacy = await db.prepare(`SELECT event_hash FROM audit_events WHERE request_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`).bind(requestId).first<{ event_hash: string }>()
  return legacy?.event_hash ?? null
}

async function buildAuditEvent(db: D1DatabaseLike, input: { requestId: string; eventType: string; actorType: string; actorId?: string | null; payload: Record<string, unknown>; createdAt: string }, previousHash: string | null) {
  const eventHash = await computeAuditEventHash({ ...input, previousHash })
  const statement = db.prepare(`INSERT INTO audit_events (id, request_id, event_type, actor_type, actor_id, payload_json, previous_hash, event_hash, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM requests WHERE id = ? AND audit_tail_hash IS ?)`).bind(
    crypto.randomUUID(), input.requestId, input.eventType, input.actorType, input.actorId ?? null, JSON.stringify(input.payload), previousHash, eventHash, input.createdAt, input.requestId, previousHash)
  return { statement, eventHash }
}

async function appendAuditEvent(db: D1DatabaseLike, input: { requestId: string; eventType: string; actorType: string; actorId?: string | null; payload: Record<string, unknown>; createdAt: string }): Promise<void> {
  const previousHash = await currentAuditTail(db, input.requestId)
  const { statement, eventHash } = await buildAuditEvent(db, input, previousHash)
  const tailUpdate = db.prepare(`UPDATE requests SET audit_tail_hash = ? WHERE id = ? AND audit_tail_hash IS ?`).bind(eventHash, input.requestId, previousHash)
  if (db.batch) {
    const results = await db.batch([tailUpdate, statement])
    if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) throw new Error('Audit append conflicted with another writer')
    return
  }
  const updateResult = await tailUpdate.run()
  if (!updateResult.success || !(updateResult.meta?.changes)) throw new Error('Audit append conflicted with another writer')
  const eventResult = await statement.run()
  if (!eventResult.success || !(eventResult.meta?.changes)) throw new Error('Audit append failed after tail update')
}

export function createD1RequestRepository(db: D1DatabaseLike): RequestStateRepository {
  return {
    async createRequest(input: ValidatedRequest, ownerId?: string) {
      const id = crypto.randomUUID(), now = new Date().toISOString()
      const { statement: auditStatement, eventHash } = await buildAuditEvent(db, { requestId: id, eventType: 'request_validated', actorType: 'user', actorId: ownerId ?? null, payload: { title: input.normalizedTitle, agency: input.normalizedAgency, itemCount: input.items.length }, createdAt: now }, null)
      const statements: D1Statement[] = [db.prepare(`INSERT INTO requests (id, title, agency, jurisdiction, purpose, scope_json, status, owner_id, audit_tail_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'validated', ?, ?, ?, ?)`).bind(id, input.normalizedTitle, input.normalizedAgency, input.jurisdiction ?? null, input.purpose ?? null, JSON.stringify({ scope: input.scope ?? null, items: input.items }), ownerId ?? null, eventHash, now, now)]
      for (const item of input.items) statements.push(db.prepare(`INSERT INTO request_items (id, request_id, category, description, date_start, date_end, custodian, system_hint, format, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unanswered')`).bind(crypto.randomUUID(), id, item.category, item.description, item.dateStart ?? null, item.dateEnd ?? null, item.custodian ?? null, item.systemHint ?? null, item.format ?? null))
      statements.push(auditStatement)
      if (db.batch) { const results = await db.batch(statements); if (results.some((result) => result.success === false)) throw new Error('Request creation transaction failed') }
      else for (const statement of statements) await statement.run()
      return { id }
    },

    async getRequest(id: string) {
      const row = await db.prepare(`SELECT id, title, agency, jurisdiction, purpose, scope_json, status, owner_id, approved_artifact_json, approved_artifact_hash, approved_at, approved_by, created_at, updated_at FROM requests WHERE id = ?`).bind(id).first<Record<string, unknown>>()
      return row ? toRecord(row) : null
    },

    async listRequests(ownerId?: string) {
      const select = `SELECT id, title, agency, jurisdiction, purpose, scope_json, status, owner_id, approved_artifact_json, approved_artifact_hash, approved_at, approved_by, created_at, updated_at FROM requests`
      const result = ownerId ? await db.prepare(`${select} WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100`).bind(ownerId).all<Record<string, unknown>>() : await db.prepare(`${select} ORDER BY updated_at DESC LIMIT 100`).all<Record<string, unknown>>()
      return (result.results ?? []).map(toRecord)
    },

    async setApprovedArtifact(id: string, artifact: ApprovedArtifact, hash: string, actor: string) {
      const current = await db.prepare(`SELECT status, approved_artifact_hash, audit_tail_hash FROM requests WHERE id = ?`).bind(id).first<{ status: RequestState; approved_artifact_hash: string | null; audit_tail_hash: string | null }>()
      if (!current || current.status !== 'review') throw new Error('Request must be in review before approval')
      if (current.approved_artifact_hash) throw new Error('Request already has an approved artifact')
      const now = new Date().toISOString(), previousHash = current.audit_tail_hash ?? await currentAuditTail(db, id)
      const { statement: auditStatement, eventHash } = await buildAuditEvent(db, { requestId: id, eventType: 'approved_artifact_bound', actorType: 'user', actorId: actor, payload: { artifactHash: hash, requestId: id }, createdAt: now }, previousHash)
      const update = db.prepare(`UPDATE requests SET status = 'approved', approved_artifact_json = ?, approved_artifact_hash = ?, approved_at = ?, approved_by = ?, audit_tail_hash = ?, updated_at = ? WHERE id = ? AND status = 'review' AND approved_artifact_hash IS NULL AND audit_tail_hash IS ?`).bind(JSON.stringify(artifact), hash, now, actor, eventHash, now, id, previousHash)
      if (db.batch) { const results = await db.batch([update, auditStatement]); if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) throw new Error('Approval conflicted with another writer') }
      else { const result = await update.run(); if (!result.success || !(result.meta?.changes)) throw new Error('Approval conflicted with another writer'); const auditResult = await auditStatement.run(); if (!auditResult.success || !(auditResult.meta?.changes)) throw new Error('Approval audit append failed') }
      const record = await this.getRequest(id); if (!record) throw new Error('Request disappeared after approval'); return record
    },

    async transition(id: string, from: RequestState, to: RequestState, actor: string) {
      if (!canTransition(from, to)) throw new Error(`Invalid request transition: ${from} -> ${to}`)
      const current = await db.prepare(`SELECT status, audit_tail_hash, approved_artifact_hash FROM requests WHERE id = ?`).bind(id).first<{ status: RequestState; audit_tail_hash: string | null; approved_artifact_hash: string | null }>()
      if (!current || current.status !== from) throw new Error('Request transition was not persisted; request may not exist or status changed concurrently')
      if (to === 'queued' && !current.approved_artifact_hash) throw new Error('Cannot queue request without an approved artifact')
      const now = new Date().toISOString(), previousHash = current.audit_tail_hash ?? await currentAuditTail(db, id)
      const { statement: auditStatement, eventHash } = await buildAuditEvent(db, { requestId: id, eventType: 'request_transition', actorType: 'user', actorId: actor, payload: { from, to }, createdAt: now }, previousHash)
      const update = db.prepare(`UPDATE requests SET status = ?, audit_tail_hash = ?, updated_at = ? WHERE id = ? AND status = ? AND audit_tail_hash IS ?`).bind(to, eventHash, now, id, from, previousHash)
      if (db.batch) { const results = await db.batch([update, auditStatement]); if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) throw new Error('Request transition conflicted with another writer') }
      else { const result = await update.run(); if (!result.success || !(result.meta?.changes)) throw new Error('Request transition conflicted with another writer'); const auditResult = await auditStatement.run(); if (!auditResult.success || !(auditResult.meta?.changes)) throw new Error('Request transition audit append failed') }
      const record = await this.getRequest(id); if (!record) throw new Error('Request disappeared after transition'); return record
    },

    async recordAuditEvent({ requestId, eventType, actor, payload }) { await appendAuditEvent(db, { requestId, eventType, actorType: 'system', actorId: actor, payload, createdAt: new Date().toISOString() }) },
    async recordFulfillmentEvent({ requestId, eventType, actor, payload }) { await appendAuditEvent(db, { requestId, eventType, actorType: 'system', actorId: actor, payload, createdAt: new Date().toISOString() }) },
    async recordProviderWebhookEvent({ requestId, eventId, status, actor, payload }) {
      const event = db.prepare(`INSERT INTO fulfillment_events (id, provider, event_id, request_id, status, payload_json) VALUES (?, 'mailmypdf', ?, ?, ?, ?)`).bind(crypto.randomUUID(), eventId, requestId, status, JSON.stringify(payload))
      try { const result = await event.run(); if (!result.success || !(result.meta?.changes)) return false } catch (error) { if (String(error).toLowerCase().includes('unique')) return false; throw error }
      await appendAuditEvent(db, { requestId, eventType: 'mailmypdf_webhook', actorType: 'system', actorId: actor, payload: { eventId, status, ...payload }, createdAt: new Date().toISOString() }); return true
    },
    async verifyAuditChain(requestId: string) {
      const rows = await db.prepare(`SELECT event_hash, previous_hash, created_at FROM audit_events WHERE request_id = ? ORDER BY created_at ASC, rowid ASC`).bind(requestId).all<{ event_hash: string; previous_hash: string | null; created_at: string }>()
      let previous: string | null = null
      for (const row of rows.results ?? []) if (row.previous_hash !== previous) return { valid: false, checked: rows.results?.length ?? 0, error: 'Audit chain predecessor mismatch' }; else previous = row.event_hash
      return { valid: true, checked: rows.results?.length ?? 0 }
    },
  }
}
