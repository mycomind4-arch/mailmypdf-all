import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareRegistration } from './registration-adapter.js'
import { createFoundryRun } from './orchestrator.js'

test('registration is unavailable until the run is complete', () => {
  const run = createFoundryRun('run-1', 'vertical-1')
  const state = { run, currentStage: 'REGISTER' as const, status: 'HUMAN_REVIEW' as const }
  assert.equal(prepareRegistration(run, state, { verticalId: 'vertical-1', repository: 'org/repo', capabilities: ['documents'], theme: 'teal' }), null)
})
