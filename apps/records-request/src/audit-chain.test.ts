import { describe, expect, it } from 'vitest'
import { computeAuditEventHash } from './audit-chain'

describe('audit chain', () => {
  it('produces deterministic SHA-256 hashes', async () => {
    const input = {
      requestId: 'request-1',
      eventType: 'request_transition',
      actorType: 'user',
      actorId: 'user-1',
      payload: { to: 'review', from: 'validated' },
      createdAt: '2026-08-24T00:00:00.000Z',
      previousHash: null,
    }
    const first = await computeAuditEventHash(input)
    const second = await computeAuditEventHash(input)
    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(await computeAuditEventHash({ ...input, previousHash: 'a'.repeat(64) })).not.toBe(first)
  })
})
