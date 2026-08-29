import assert from 'node:assert/strict'
import test from 'node:test'
import { createApprovalRequest, MemoryApprovalStore } from './approval.js'

test('approval lifecycle supports explicit approve and prevents replay', async () => {
  const store = new MemoryApprovalStore()
  await store.create(createApprovalRequest({
    id: 'approval-1',
    runId: 'run-1',
    action: 'send_mail',
    reason: 'Consequential external communication',
    createdAt: '2026-08-17T00:00:00Z',
  }))

  const approved = await store.decide('approval-1', 'APPROVED', 'operator-1', 'Reviewed')
  assert.equal(approved.status, 'APPROVED')
  assert.equal(approved.decidedBy, 'operator-1')
  await assert.rejects(() => store.decide('approval-1', 'REJECTED', 'operator-2'), /already APPROVED/)
})

test('expired approvals cannot be approved', async () => {
  const store = new MemoryApprovalStore()
  await store.create(createApprovalRequest({
    id: 'approval-2',
    runId: 'run-2',
    action: 'send_mail',
    reason: 'Requires review',
    createdAt: '2026-08-17T00:00:00Z',
    expiresAt: '2026-08-17T00:00:10Z',
  }))

  await assert.rejects(
    () => store.decide('approval-2', 'APPROVED', 'operator-1', undefined, new Date('2026-08-17T00:00:11Z')),
    /expired/,
  )
  assert.equal((await store.get('approval-2'))?.status, 'EXPIRED')
})
