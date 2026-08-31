import { describe, expect, it } from 'vitest'
import { buildFulfillmentIdempotencyKey, isTerminalFulfillmentStatus } from './fulfillment-attempts'

describe('fulfillment attempt contract', () => {
  it('builds deterministic idempotency keys', () => {
    expect(buildFulfillmentIdempotencyKey('request-1', 'abc123')).toBe('request-1:abc123')
    expect(buildFulfillmentIdempotencyKey('request-1', 'abc123')).toBe(buildFulfillmentIdempotencyKey('request-1', 'abc123'))
  })

  it('recognizes terminal statuses', () => {
    expect(isTerminalFulfillmentStatus('accepted')).toBe(true)
    expect(isTerminalFulfillmentStatus('failed')).toBe(true)
    expect(isTerminalFulfillmentStatus('pending')).toBe(false)
  })
})
