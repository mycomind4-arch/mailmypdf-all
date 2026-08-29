import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(new URL('./0001_initial.sql', import.meta.url), 'utf8')

describe('initial D1 schema', () => {
  it('defines every runtime table', () => {
    for (const table of ['requests', 'request_items', 'communications', 'productions', 'evidence', 'findings', 'actions', 'audit_events']) {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
  })

  it('enforces the application request lifecycle in the database', () => {
    expect(schema).toContain("CHECK (status IN ('draft','validated','review','approved','queued','submitted','tracking','completed','failed'))")
  })

  it('enforces audit actor types and evidence review states', () => {
    expect(schema).toContain("CHECK (actor_type IN ('system','user','admin','scheduled_job','api_call'))")
    expect(schema).toContain("CHECK (review_status IN ('unreviewed','verified','rejected'))")
  })

  it('creates indexes required by lifecycle and evidence queries', () => {
    expect(schema).toContain('idx_requests_status_updated')
    expect(schema).toContain('idx_evidence_request')
    expect(schema).toContain('idx_findings_request')
  })
})
