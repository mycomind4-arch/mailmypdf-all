import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('./0002_workflow_foundation.sql', import.meta.url), 'utf8')

describe('workflow foundation migration', () => {
  it('adds request ownership and fulfillment event idempotency', () => {
    expect(migration).toContain('ALTER TABLE requests ADD COLUMN owner_id TEXT')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS fulfillment_events')
    expect(migration).toContain('UNIQUE(provider,event_id)')
  })

  it('adds indexes for owner-scoped request reads', () => {
    expect(migration).toContain('idx_requests_owner_status')
    expect(migration).toContain('idx_fulfillment_events_request')
  })
})
