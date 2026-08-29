import { describe, expect, it } from 'vitest'
import { isSuccessfulReservation } from './reservation'

describe('fulfillment reservation semantics', () => {
  it('treats only a fresh, pending, or accepted reservation as non-duplicating success', () => {
    expect(isSuccessfulReservation({
      kind: 'reserved',
      reservation: { id: '1', requestId: 'r1', idempotencyKey: 'r1:h1', status: 'pending' },
    })).toBe(true)
    expect(isSuccessfulReservation({
      kind: 'already_pending',
      reservation: { id: '1', requestId: 'r1', idempotencyKey: 'r1:h1', status: 'pending' },
    })).toBe(true)
    expect(isSuccessfulReservation({
      kind: 'already_accepted',
      reservation: { id: '1', requestId: 'r1', idempotencyKey: 'r1:h1', status: 'accepted' },
    })).toBe(true)
    expect(isSuccessfulReservation({
      kind: 'already_failed',
      reservation: { id: '1', requestId: 'r1', idempotencyKey: 'r1:h1', status: 'failed' },
    })).toBe(false)
  })
})
