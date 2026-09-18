import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MemoryHostTaskQueue,
  MemoryHostTaskScheduler,
  validateScheduledRunAt,
} from './host-scheduling.js'

test('scheduler deduplicates repeated requests by stable key', async () => {
  const scheduler = new MemoryHostTaskScheduler()
  const input = {
    kind: 'deadline_scan' as const,
    dedupeKey: 'deadline-scan:2026-09-19',
    payload: { date: '2026-09-19' },
    runAt: '2026-09-19T08:00:00-07:00',
  }

  const first = await scheduler.schedule(input)
  const second = await scheduler.schedule(input)

  assert.equal(first.id, second.id)
  assert.equal(first.runAt, '2026-09-19T15:00:00.000Z')
})

test('scheduler rejects invalid dates and can cancel idempotently', async () => {
  assert.throws(() => validateScheduledRunAt('not-a-date'), /valid date/)

  const scheduler = new MemoryHostTaskScheduler()
  const scheduled = await scheduler.schedule({
    kind: 'workflow_resume',
    dedupeKey: 'resume:matter-1:step-4',
    payload: { matterId: 'matter-1' },
    matterId: 'matter-1',
    workflowId: 'workflow-1',
    runAt: '2026-09-19T12:00:00Z',
  })

  const cancelled = await scheduler.cancel(scheduled.id)
  const again = await scheduler.cancel(scheduled.id)
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(again.id, cancelled.id)
})

test('queue deduplicates immediate work by stable key', async () => {
  const queue = new MemoryHostTaskQueue()
  const input = {
    kind: 'provider_reconciliation' as const,
    dedupeKey: 'lob:order-123:reconcile',
    payload: { orderId: 'order-123' },
  }

  const first = await queue.enqueue(input)
  const second = await queue.enqueue(input)

  assert.equal(first.id, second.id)
  assert.equal(first.status, 'queued')
})

test('host tasks require a dedupe key', async () => {
  const queue = new MemoryHostTaskQueue()
  await assert.rejects(
    () => queue.enqueue({ kind: 'custom', dedupeKey: ' ', payload: {} }),
    /dedupeKey/,
  )
})
