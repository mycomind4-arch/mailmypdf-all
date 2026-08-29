import assert from 'node:assert/strict'
import test from 'node:test'
import { createIntelligenceToolRegistry } from './intelligence-tools.js'

test('intelligence tool registry exposes governed deterministic tools', () => {
  const tools = createIntelligenceToolRegistry()
  assert.deepEqual(tools.map((tool) => tool.name), [
    'document_transition_allowed',
    'evaluate_evidence',
    'detect_contradictions',
    'compute_risk_assessment',
    'assess_case',
  ])
  assert.ok(tools.every((tool) => tool.idempotent))
  assert.ok(tools.every((tool) => tool.requiresApproval === false))
})

test('document lifecycle tool rejects invalid transitions without mutating state', async () => {
  const tool = createIntelligenceToolRegistry()[0]
  assert.deepEqual(await tool.execute({ from: 'uploaded', to: 'processing' }, {
    runId: 'run-1',
  }), { allowed: false })
  assert.deepEqual(await tool.execute({ from: 'uploaded', to: 'validating' }, {
    runId: 'run-1',
  }), { allowed: true })
})
