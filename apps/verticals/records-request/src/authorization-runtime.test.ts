import { afterEach, describe, expect, it } from 'vitest'
import {
  canApproveWithRole,
  getApprovalPrincipal,
  installApprovalAuthorizationResolver,
} from './authorization-runtime'

afterEach(() => {
  installApprovalAuthorizationResolver(async () => null)
})

describe('approval authorization runtime', () => {
  it('returns null when the resolver throws', async () => {
    installApprovalAuthorizationResolver(async () => {
      throw new Error('auth backend unavailable')
    })

    await expect(getApprovalPrincipal()).resolves.toBeNull()
  })

  it('rejects an unauthenticated principal even with an approval role', () => {
    expect(canApproveWithRole({ subject: 'user-1', roles: ['admin'], authenticated: false })).toBe(false)
  })

  it('rejects an empty subject even when authenticated', () => {
    expect(canApproveWithRole({ subject: '  ', roles: ['admin'], authenticated: true })).toBe(false)
  })

  it('accepts an authenticated principal with an allowed role', () => {
    expect(canApproveWithRole({ subject: 'user-1', roles: ['case_approver'], authenticated: true })).toBe(true)
  })
})
