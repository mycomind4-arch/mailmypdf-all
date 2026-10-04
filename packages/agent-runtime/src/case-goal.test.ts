import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaseGoal, transitionCaseGoal } from './case-goal.js'
const now = '2026-10-04T02:00:00Z'
const goal = () => createCaseGoal({ id: 'case-1', ownerId: 'owner-1', objective: 'Get my deposit back', desiredOutcome: 'Refund received', category: 'deposit', soughtValue: { amountMinor: 90000, currency: 'USD' }, now })

test('a goal starts private and unlinked; action completion does not resolve the outcome', () => {
  const initial = goal()
  const active = transitionCaseGoal(initial, 'owner-1', { type: 'activate' }, now)
  const sent = transitionCaseGoal(active, 'owner-1', { type: 'record-action', actionKey: 'send-1' }, now)
  assert.equal(sent.state, 'active')
  assert.deepEqual(initial.actionKeys, [])
  assert.equal(sent.revision, 3)
})
test('case ownership, terminal states, and monotonic time are enforced', () => {
  assert.throws(() => transitionCaseGoal(goal(), 'intruder', { type: 'activate' }, now), /OWNERSHIP/)
  assert.throws(() => transitionCaseGoal(goal(), 'owner-1', { type: 'activate' }, '2026-10-01'), /TIME/)
  const cancelled = transitionCaseGoal(goal(), 'owner-1', { type: 'cancel' }, now)
  assert.throws(() => transitionCaseGoal(cancelled, 'owner-1', { type: 'activate' }, now), /TERMINAL/)
})
test('waiting requires an active case and future deadline; resuming clears the wait', () => {
  assert.throws(() => transitionCaseGoal(goal(), 'owner-1', { type: 'wait', reason: 'response' }, now), /TRANSITION/)
  const active = transitionCaseGoal(goal(), 'owner-1', { type: 'activate' }, now)
  assert.throws(() => transitionCaseGoal(active, 'owner-1', { type: 'wait', reason: 'response', dueAt: now }, now), /DEADLINE/)
  const waiting = transitionCaseGoal(active, 'owner-1', { type: 'wait', reason: 'Merchant response', dueAt: '2026-10-09T02:00:00Z' }, now)
  assert.equal(waiting.waiting?.reason, 'Merchant response')
  const resumed = transitionCaseGoal(waiting, 'owner-1', { type: 'resume' }, now)
  assert.equal(resumed.state, 'active'); assert.equal(resumed.waiting, undefined)
})
test('resolution requires linked evidence and explicit owner confirmation', () => {
  const active = transitionCaseGoal(goal(), 'owner-1', { type: 'activate' }, now)
  assert.throws(() => transitionCaseGoal(active, 'owner-1', { type: 'resolve', outcome: 'Paid', evidenceIds: ['unlinked'] }, now), /EVIDENCE/)
  const evidenced = transitionCaseGoal(active, 'owner-1', { type: 'attach-evidence', evidenceId: 'refund-receipt' }, now)
  const resolved = transitionCaseGoal(evidenced, 'owner-1', { type: 'resolve', outcome: 'Refund received', evidenceIds: ['refund-receipt'], recoveredValue: { amountMinor: 90000, currency: 'USD' } }, now)
  assert.equal(resolved.resolution?.confirmedBy, 'owner-1')
  assert.equal(resolved.resolution?.recoveredValue?.amountMinor, 90000)
  assert.equal(resolved.state, 'resolved')
  assert.throws(() => transitionCaseGoal(evidenced, 'owner-1', { type: 'resolve', outcome: 'Paid', evidenceIds: ['refund-receipt'], recoveredValue: { amountMinor: 1, currency: 'EUR' } }, now), /CURRENCY/)
})
test('money uses integer minor units, never floating-point estimates', () => {
  assert.throws(() => createCaseGoal({ id: 'x', ownerId: 'u', objective: 'x', desiredOutcome: 'x', category: 'x', now, soughtValue: { amountMinor: 1.23, currency: 'USD' } }), /MONEY/)
})
