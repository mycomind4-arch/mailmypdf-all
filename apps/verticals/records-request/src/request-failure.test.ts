import { describe, expect, it } from 'vitest'
import { canTransition, type RequestState } from './request-repository'

describe('request failure transitions', () => {
  it('allows provider failures to terminate queued or submitted requests', () => {
    expect(canTransition('queued', 'failed')).toBe(true)
    expect(canTransition('submitted', 'failed')).toBe(true)
    expect(canTransition('tracking', 'failed')).toBe(true)
  })

  it('keeps terminal states immutable', () => {
    for (const state of ['completed', 'failed'] as RequestState[]) {
      expect(canTransition(state, 'completed')).toBe(false)
      expect(canTransition(state, 'failed')).toBe(false)
    }
  })
})
