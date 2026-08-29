/**
 * Milestone 77: Vertical Lifecycle Management — Tests
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { LifecycleManager } from './lifecycle-manager.js'

test('M77: lifecycle manager creates a new vertical in researching state', () => {
  const mgr = new LifecycleManager()
  const history = mgr.create('test-vertical')

  assert.equal(history.verticalId, 'test-vertical')
  assert.equal(history.currentState, 'researching')
  assert.equal(history.events.length, 1)
  assert.equal(history.events[0]!.type, 'created')
})

test('M77: valid transitions succeed', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')

  mgr.transition('test-vertical', 'building', 'Research complete')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'building')

  mgr.transition('test-vertical', 'previewing', 'Build complete')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'previewing')

  mgr.transition('test-vertical', 'registered', 'Preview verified')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'registered')

  mgr.transition('test-vertical', 'production', 'Approved')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'production')
})

test('M77: invalid transitions throw', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')

  // researching → production is invalid
  assert.throws(() => mgr.transition('test-vertical', 'production', 'Skip'), /Invalid transition/)

  // researching → building → production is invalid
  mgr.transition('test-vertical', 'building', 'Moving on')
  assert.throws(() => mgr.transition('test-vertical', 'production', 'Skip'), /Invalid transition/)
})

test('M77: gate events are recorded in history', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')

  mgr.recordGate('test-vertical', 'research', true, { score: 90 })
  mgr.recordGate('test-vertical', 'build', true, { score: 95 })
  mgr.recordGate('test-vertical', 'qa', false, { reason: 'Missing security headers' })

  const history = mgr.get('test-vertical')!
  assert.equal(history.events.filter(e => e.type === 'gate_passed').length, 2)
  assert.equal(history.events.filter(e => e.type === 'gate_failed').length, 1)
})

test('M77: deployment events are recorded', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')

  mgr.recordDeployment('test-vertical', 'https://preview.pages.dev/test', 'preview')
  mgr.recordDeployment('test-vertical', 'https://test.mailmypdf.com', 'production')

  const deployEvents = mgr.get('test-vertical')!.events.filter(e => e.type === 'deployed')
  assert.equal(deployEvents.length, 2)
  assert.ok(deployEvents.some(e => e.environment === 'preview'))
  assert.ok(deployEvents.some(e => e.environment === 'production'))
})

test('M77: registration event is recorded', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')
  mgr.recordRegistration('test-vertical', 'reg-123')

  const regEvents = mgr.get('test-vertical')!.events.filter(e => e.type === 'registered')
  assert.equal(regEvents.length, 1)
})

test('M77: disable and retire work correctly', () => {
  const mgr = new LifecycleManager()
  mgr.create('test-vertical')
  mgr.transition('test-vertical', 'building', 'Build started')
  mgr.transition('test-vertical', 'previewing', 'Preview deployed')
  mgr.transition('test-vertical', 'registered', 'Registered')
  mgr.transition('test-vertical', 'production', 'Live')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'production')

  mgr.disable('test-vertical', 'Scheduled maintenance')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'disabled')

  // Can re-enable from disabled
  mgr.transition('test-vertical', 'production', 'Maintenance complete')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'production')

  mgr.disable('test-vertical', 'End of life')
  mgr.transition('test-vertical', 'rejected', 'Retired')
  assert.equal(mgr.get('test-vertical')?.currentState ?? "", 'rejected')
})

test('M77: happy path simulates full lifecycle', async () => {
  const mgr = new LifecycleManager()
  const history = await mgr.runHappyPath('happy-vertical', {
    previewUrl: 'https://preview.pages.dev/happy',
    productionUrl: 'https://happy.mailmypdf.com',
    registryId: 'reg-happy-001',
  })

  assert.equal(history.currentState, 'production')
  assert.ok(history.events.length >= 10) // created + gates + transitions + deployments + registration

  // Verify state progression
  const transitions = history.events.filter(e => e.type === 'state_change')
  const states = transitions.map(t => (t as any).to)
  assert.deepEqual(states, ['building', 'previewing', 'registered', 'production'])

  // Verify deployments
  const deploys = history.events.filter(e => e.type === 'deployed')
  assert.equal(deploys.length, 2)

  // Verify registration
  const regs = history.events.filter(e => e.type === 'registered')
  assert.equal(regs.length, 1)
})

test('M77: multiple verticals tracked independently', () => {
  const mgr = new LifecycleManager()
  mgr.create('vertical-a')
  mgr.create('vertical-b')
  mgr.create('vertical-c')

  assert.equal(mgr.getAll().length, 3)

  mgr.transition('vertical-a', 'building', 'A started')
  mgr.transition('vertical-b', 'building', 'B started')

  assert.equal(mgr.get('vertical-a')!.currentState, 'building')
  assert.equal(mgr.get('vertical-b')!.currentState, 'building')
  assert.equal(mgr.get('vertical-c')!.currentState, 'researching')
})

test('M77: lifecycle event count tracks history depth', () => {
  const mgr = new LifecycleManager()
  mgr.create('counted-vertical')

  const initialCount = mgr.getEventCount('counted-vertical')
  assert.equal(initialCount, 1)

  mgr.recordGate('counted-vertical', 'research', true, { score: 90 })
  assert.equal(mgr.getEventCount('counted-vertical'), 2)

  mgr.transition('counted-vertical', 'building', 'Moving on')
  assert.equal(mgr.getEventCount('counted-vertical'), 3)
})

test('M77: lifecycle serializes for audit', async () => {
  const mgr = new LifecycleManager()
  const history = await mgr.runHappyPath('audit-vertical', {
    previewUrl: 'https://preview.pages.dev/audit',
    productionUrl: 'https://audit.mailmypdf.com',
    registryId: 'reg-audit-001',
  })

  const serialized = JSON.stringify({
    verticalId: history.verticalId,
    currentState: history.currentState,
    eventCount: history.events.length,
    createdAt: history.createdAt,
    updatedAt: history.updatedAt,
    events: history.events.map(e => ({ type: e.type, timestamp: e.timestamp })),
  })

  const parsed = JSON.parse(serialized)
  assert.equal(parsed.verticalId, 'audit-vertical')
  assert.equal(parsed.currentState, 'production')
  assert.ok(parsed.eventCount >= 10)
})
