import assert from 'node:assert/strict'
import test from 'node:test'
import { GovernedActionExecutor, MemoryActionExecutionStore, canonicalActionJson, type ActionApproval, type ActionAuthorization, type ActionRequest } from './action-executor.js'
import { ToolRegistry } from './tools.js'

const now = new Date('2026-10-04T02:00:00Z')
const request = (): ActionRequest => ({ tool: 'email.send', ownerId: 'owner-1', actorId: 'owner-1', caseId: 'case-1', runId: 'run-1', connectionId: 'gmail-1', idempotencyKey: 'send-1', input: { to: ['recipient@example.test'], body: 'Hello' } })
function fixture(options: { read?: boolean; execute?: () => Promise<unknown>; store?: MemoryActionExecutionStore } = {}) {
  const registry = new ToolRegistry()
  let calls = 0
  registry.register({
    name: 'email.send', description: 'fixture', risk: 'HIGH', requiresApproval: !options.read, reversible: false, idempotent: false,
    actionPolicy: { version: 1, provider: 'gmail', effect: options.read ? 'none' : 'email', scopes: ['mail:send'], maxInputBytes: 1024 },
    execute: async () => { calls++; return options.execute ? options.execute() : { id: 'receipt-1' } },
  })
  const approvals = new Map<string, ActionApproval>()
  const authorization: ActionAuthorization = {
    async authorize(input) {
      if (input.ownerId !== input.actorId || input.caseId !== 'case-1') throw new Error('OWNERSHIP_DENIED')
      return { scopes: ['mail:send'] }
    },
    async loadApproval(_, id) { return approvals.get(id) },
  }
  const store = options.store ?? new MemoryActionExecutionStore()
  const executor = new GovernedActionExecutor(registry, store, authorization, () => now)
  async function approve(input = request()) {
    const review = await executor.review(input)
    approvals.set('approval-1', { id: 'approval-1', ownerId: input.ownerId, approvedBy: input.actorId, requestSha256: review.requestSha256, status: 'approved', approvedAt: '2026-10-04T01:00:00Z', expiresAt: '2026-10-04T03:00:00Z' })
    return review
  }
  return { executor, registry, store, authorization, approvals, approve, calls: () => calls }
}

test('side effects require a stored exact approval; a caller cannot supply an approval boolean', async () => {
  const f = fixture()
  await assert.rejects(f.executor.invoke(request()), /APPROVAL/)
  assert.equal(f.calls(), 0)
  assert.equal((await f.executor.review(request())).requiresApproval, true)
  await f.approve()
  const result = await f.executor.invoke(request(), { approvalId: 'approval-1' })
  assert.equal(result.state, 'succeeded')
  assert.equal(result.approvalId, 'approval-1')
  assert.equal(f.calls(), 1)
})

test('changed recipients, payload, case, account, run, tool version, or key invalidate approval', async () => {
  const f = fixture()
  await f.approve()
  for (const input of [
    { ...request(), input: { to: ['changed@example.test'], body: 'Hello' } },
    { ...request(), connectionId: 'gmail-2' }, { ...request(), runId: 'run-2' },
    { ...request(), idempotencyKey: 'key-2' }, { ...request(), caseId: 'case-2' },
  ]) await assert.rejects(f.executor.invoke(input, { approvalId: 'approval-1' }))
  f.registry.get('email.send')!.actionPolicy!.version = 2
  await assert.rejects(f.executor.invoke(request(), { approvalId: 'approval-1' }), /APPROVAL/)
  assert.equal(f.calls(), 0)
})

test('expired, future, revoked, cross-owner and malformed approval times block execution', async () => {
  const f = fixture()
  await f.approve()
  const base = f.approvals.get('approval-1')!
  for (const patch of [{ expiresAt: now.toISOString() }, { approvedAt: '2026-10-05T00:00:00Z' }, { expiresAt: 'invalid' }, { status: 'revoked' as const }, { ownerId: 'other' }, { approvedBy: 'other' }]) {
    f.approvals.set('approval-1', { ...base, ...patch })
    await assert.rejects(f.executor.invoke(request(), { approvalId: 'approval-1' }), /APPROVAL/)
  }
  assert.equal(f.calls(), 0)
})
test('approval validity is checked after the asynchronous approval lookup', async () => {
  const f = fixture()
  await f.approve()
  let clock = now
  const executor = new GovernedActionExecutor(f.registry, f.store, f.authorization, () => clock)
  f.authorization.loadApproval = async (_, id) => {
    clock = new Date('2026-10-04T03:00:00Z')
    return f.approvals.get(id)
  }
  await assert.rejects(executor.invoke(request(), { approvalId: 'approval-1' }), /APPROVAL/)
  assert.equal(f.calls(), 0)
});

test('atomic claims serialize concurrent calls and return one provider receipt', async () => {
  let release!: () => void
  const barrier = new Promise<void>((resolve) => { release = resolve })
  const f = fixture({ execute: async () => { await barrier; return { id: 'one' } } })
  await f.approve()
  const first = f.executor.invoke(request(), { approvalId: 'approval-1' })
  while (f.calls() === 0) await new Promise((resolve) => setImmediate(resolve))
  const second = await f.executor.invoke(request(), { approvalId: 'approval-1' })
  assert.equal(second.state, 'running')
  release()
  assert.equal((await first).state, 'succeeded')
  const replay = await f.executor.invoke(request(), { approvalId: 'approval-1' })
  assert.deepEqual(replay.output, { id: 'one' })
  assert.equal(f.calls(), 1)
})

test('reusing a key with changed input fails even with a fresh valid approval', async () => {
  const f = fixture()
  await f.approve()
  await f.executor.invoke(request(), { approvalId: 'approval-1' })
  const changed = { ...request(), input: { body: 'Different' } }
  await f.approve(changed)
  await assert.rejects(f.executor.invoke(changed, { approvalId: 'approval-1' }), /IDEMPOTENCY_CONFLICT/)
  assert.equal(f.calls(), 1)
})

test('cross-owner replay cannot return another account output', async () => {
  const f = fixture({ read: true })
  await f.executor.invoke(request())
  await f.executor.invoke({ ...request(), ownerId: 'owner-2', actorId: 'owner-2' })
  assert.equal(f.calls(), 2)
  assert.equal(await f.store.loadOwned('owner-3', 'send-1'), undefined)
})

test('failed writes require reconciliation and never automatically replay', async () => {
  const f = fixture({ execute: async () => { throw new Error('token=secret provider failed after sending') } })
  await f.approve()
  const result = await f.executor.invoke(request(), { approvalId: 'approval-1' })
  assert.equal(result.state, 'needs_review')
  assert.equal(result.errorCode, 'ACTION_OUTCOME_UNCERTAIN')
  assert.equal(JSON.stringify(result).includes('secret'), false)
  await f.executor.invoke(request(), { approvalId: 'approval-1' })
  assert.equal(f.calls(), 1)
})

test('store failure after a provider write preserves a running claim and blocks repeat execution', async () => {
  class FailingStore extends MemoryActionExecutionStore { async finish(): Promise<void> { throw new Error('storage offline') } }
  const f = fixture({ store: new FailingStore() })
  await f.approve()
  await assert.rejects(f.executor.invoke(request(), { approvalId: 'approval-1' }), /storage offline/)
  assert.equal((await f.executor.invoke(request(), { approvalId: 'approval-1' })).state, 'running')
  assert.equal(f.calls(), 1)
})

test('ownership, scopes, input limits and aborted requests block before any provider effect', async () => {
  const f = fixture({ read: true })
  await assert.rejects(f.executor.invoke({ ...request(), actorId: 'intruder' }), /OWNERSHIP/)
  f.authorization.authorize = async () => ({ scopes: [] })
  await assert.rejects(f.executor.invoke(request()), /SCOPE/)
  await assert.rejects(f.executor.invoke({ ...request(), input: 'x'.repeat(2000) }), /TOO_LARGE/)
  f.authorization.authorize = async () => ({ scopes: ['mail:send'] })
  await assert.rejects(f.executor.invoke(request(), { signal: AbortSignal.abort() }), /ABORTED/)
  assert.equal(f.calls(), 0)
})

test('JSON canonicalization ignores key order and rejects lossy, cyclic, or accessor input', () => {
  assert.equal(canonicalActionJson({ b: 1, a: [true, null] }), canonicalActionJson({ a: [true, null], b: 1 }))
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  for (const input of [undefined, { x: undefined }, NaN, Infinity, new Date(), cycle, { get x() { throw new Error('accessed') } }, [, 1]]) {
    assert.throws(() => canonicalActionJson(input))
  }
})

test('unsafe or missing action policies cannot downgrade external effects to a legacy boolean gate', async () => {
  const f = fixture()
  f.registry.get('email.send')!.requiresApproval = false
  await assert.rejects(f.executor.review(request()), /EFFECT_REQUIRES_APPROVAL/)
  delete f.registry.get('email.send')!.actionPolicy
  await assert.rejects(f.executor.review(request()), /POLICY_REQUIRED/)
})

test('caller mutation during authorization cannot change the approved provider input', async () => {
  const f = fixture({ read: true })
  const input = request()
  let received: unknown
  f.registry.get('email.send')!.execute = async (value) => { received = value; return {} }
  f.authorization.authorize = async () => { input.input = { body: 'mutated' }; input.ownerId = 'intruder'; return { scopes: ['mail:send'] } }
  const record = await f.executor.invoke(input)
  assert.equal(record.review.ownerId, 'owner-1')
  assert.deepEqual(received, request().input)
})
