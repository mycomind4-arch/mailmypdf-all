import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./0004_audit_tail.sql', import.meta.url), 'utf8')

describe('audit tail migration', () => {
  it('adds a durable request audit tail', () => {
    expect(migration).toContain('ALTER TABLE requests ADD COLUMN audit_tail_hash TEXT')
  })

  it('adds an owner recency index for scoped dashboards', () => {
    expect(migration).toContain('idx_requests_owner_updated')
    expect(migration).toContain('owner_id, updated_at DESC')
  })
})
