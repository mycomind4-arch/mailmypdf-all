import assert from 'node:assert/strict'
import test from 'node:test'
import { TriggerHttpTaskClient } from './trigger-http-client.js'

test('Trigger maps domain tasks to one deployed task and forwards a stable idempotency key', async () => {
  const client = new TriggerHttpTaskClient({ registeredTaskId: 'mailmypdf-agent-task', secretKey: 'test-key', fetch: (async (url, init) => {
    assert.equal(String(url), 'https://api.trigger.dev/api/v1/tasks/mailmypdf-agent-task/trigger')
    assert.equal(init?.redirect, 'error')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key')
    assert.deepEqual(JSON.parse(String(init?.body)), { payload: { taskId: 'case-action:123', payload: { runId: 'run-1' } }, options: { idempotencyKey: 'run-1:task-1' } })
    return new Response('{"id":"run_trigger_1"}')
  }) as typeof fetch })
  assert.deepEqual(await client.trigger('case-action:123', { runId: 'run-1' }, { idempotencyKey: 'run-1:task-1' }), { id: 'run_trigger_1' })
})
test('Trigger rejects unsafe endpoint configuration, missing identity, and malformed provider receipts', async () => {
  for (const endpoint of ['http://example.test', 'https://secret:key@example.test', 'https://example.test?secret=x']) {
    assert.throws(() => new TriggerHttpTaskClient({ endpoint, secretKey: 'test', registeredTaskId: 'task' }), /ENDPOINT/)
  }
  assert.throws(() => new TriggerHttpTaskClient({ secretKey: 'test', registeredTaskId: '../../other' }), /TASK_ID/)
  const client = new TriggerHttpTaskClient({ secretKey: 'test', registeredTaskId: 'task', fetch: (async () => new Response('{}')) as typeof fetch })
  await assert.rejects(client.trigger('task', {}), /IDENTITY/)
  await assert.rejects(client.trigger('task', {}, { idempotencyKey: 'one' }), /RESPONSE/)
})
test('Trigger errors do not leak credentials or provider response bodies', async () => {
  const client = new TriggerHttpTaskClient({ secretKey: 'sensitive-key', registeredTaskId: 'task', fetch: (async () => new Response('sensitive-key provider response', { status: 401 })) as typeof fetch })
  await assert.rejects(client.trigger('task', {}, { idempotencyKey: 'one' }), { message: 'PROVIDER_HTTP_401' })
})
