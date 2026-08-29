import { describe, expect, it } from 'vitest'
import assert from 'node:assert/strict'
import { canTransition, createD1RequestRepository, type D1DatabaseLike, type D1Statement } from './request-repository'

const makeDb = () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const rows = new Map<string, Record<string, unknown>>()
  const db: D1DatabaseLike = {
    prepare(sql) {
      const statement: D1Statement = {
        bind(...values: unknown[]) {
          calls.push({ sql, values })
          return statement
        },
        async first<T = unknown>(): Promise<T | null> {
          const id = calls.at(-1)?.values?.[0] as string | undefined
          return (typeof id === 'string' ? rows.get(id) ?? null : null) as T | null
        },
        async all() { return { results: [] } },
        async run() { return { success: true, meta: { changes: 1 } } },
      }
      return statement
    },
  }
  return { db, calls, rows }
}

describe('request repository transitions', () => {
  it('permits only the canonical lifecycle transitions', () => {
    assert.equal(canTransition('draft', 'validated'), true)
    assert.equal(canTransition('validated', 'review'), true)
    assert.equal(canTransition('review', 'approved'), true)
    assert.equal(canTransition('approved', 'queued'), true)
    assert.equal(canTransition('queued', 'submitted'), true)
    assert.equal(canTransition('submitted', 'tracking'), true)
    assert.equal(canTransition('tracking', 'completed'), true)
    assert.equal(canTransition('draft', 'approved'), false)
    assert.equal(canTransition('approved', 'submitted'), false)
  })

  it('creates an owner-scoped request and audit row atomically', async () => {
    const { db, calls } = makeDb()
    const repo = createD1RequestRepository(db)
    const result = await repo.createRequest({
      title: 'Property records',
      agency: 'County Clerk',
      normalizedTitle: 'Property records',
      normalizedAgency: 'County Clerk',
      items: [{ category: 'permits', description: 'All permits from 2024' }],
    }, 'user-123')
    assert.match(result.id, /^[0-9a-f-]{36}$/)
    assert.equal(calls.length, 3)
    assert.match(calls[0].sql, /INSERT INTO audit_events/)
    assert.match(calls[1].sql, /INSERT INTO requests/)
    assert.match(calls[1].sql, /owner_id/)
    assert.match(calls[2].sql, /INSERT INTO request_items/)
  })
})
