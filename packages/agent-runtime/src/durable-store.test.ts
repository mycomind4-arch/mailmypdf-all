import assert from 'node:assert/strict'
import test from 'node:test'
import { createDurableRun } from './durable.js'
import { MemoryDurableRunStore } from './durable-store.js'

test('durable run store persists runs and protects against duplicate creation', async () => {
  const store = new MemoryDurableRunStore()
  const run = createDurableRun('run-1', [{
    id: 'task-1',
    role: 'planner',
    objective: 'plan',
    modelClass: 'REASONING',
    input: {},
  }])

  await store.createRun(run)
  assert.deepEqual(await store.getRun('run-1'), run)
  await assert.rejects(() => store.createRun(run), /already exists/)
})

test('checkpoint writes are monotonic by sequence', async () => {
  const store = new MemoryDurableRunStore()
  await store.putCheckpoint({ runId: 'run-1', sequence: 2, createdAt: '2026-08-17T00:00:02Z', state: { step: 2 }, completedTaskIds: ['a'] })
  await store.putCheckpoint({ runId: 'run-1', sequence: 1, createdAt: '2026-08-17T00:00:01Z', state: { step: 1 }, completedTaskIds: [] })

  assert.equal((await store.getCheckpoint('run-1'))?.sequence, 2)
})
