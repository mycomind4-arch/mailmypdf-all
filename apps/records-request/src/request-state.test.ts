import { describe, it } from 'vitest'
import assert from "node:assert/strict";
import { approveRequest, canSubmit, submitApprovedRequest, type RequestRecord, type RequestStateRepository } from './request-state'

function repo(initial: RequestRecord): RequestStateRepository & { value: RequestRecord } {
  const state = { value: initial }
  return {
    get: async (id: string) => (id === state.value.id ? state.value : null),
    setStatus: async (id: string, status: string, patch: Record<string, unknown> = {}) => {
      if (id !== state.value.id) throw new Error('not found')
      state.value = { ...state.value, ...patch, status: status as RequestRecord['status'] }
      return state.value
    },
    get value() { return state.value },
  }
}

describe('request state machine', () => {
  it('only approves requests in review', async () => {
    const repository = repo({ id: 'r1', title: 'Records', agency: 'Agency', status: 'review' })
    const approved = await approveRequest(repository, 'r1')
    assert.equal(approved.status, 'approved')
    assert.ok(approved.approvedAt)
  })

  it('rejects approval from an earlier lifecycle state', async () => {
    const repository = repo({ id: 'r1', title: 'Records', agency: 'Agency', status: 'validated' })
    await assert.rejects(() => approveRequest(repository, 'r1'), /cannot be approved/)
  })

  it('never submits before approval', () => {
    assert.equal(canSubmit('review'), false)
    assert.equal(canSubmit('approved'), true)
  })

  it('records tracking and proof from fulfillment', async () => {
    const repository = repo({ id: 'r1', title: 'Records', agency: 'Agency', status: 'approved' })
    const submitted = await submitApprovedRequest(repository, {
      submit: async () => ({ trackingNumber: 'TRACK-1', proofId: 'PROOF-1' }),
    }, 'r1')
    assert.equal(submitted.status, 'submitted')
    assert.equal(submitted.trackingNumber, 'TRACK-1')
    assert.equal(submitted.proofId, 'PROOF-1')
  })

  it('moves a request to failed when fulfillment throws', async () => {
    const repository = repo({ id: 'r1', title: 'Records', agency: 'Agency', status: 'approved' })
    await assert.rejects(() => submitApprovedRequest(repository, {
      submit: async () => { throw new Error('provider unavailable') },
    }, 'r1'), /provider unavailable/)
    assert.equal(repository.value.status, 'failed')
  })
})
