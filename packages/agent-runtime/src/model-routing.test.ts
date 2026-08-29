import test from 'node:test'
import assert from 'node:assert/strict'
import { routeModel } from './model-routing.js'

test('selects the highest priority healthy permitted provider', () => {
  const result = routeModel([
    { id: 'slow', classes: ['REASONING'], healthy: true, priority: 20 },
    { id: 'fast', classes: ['REASONING'], healthy: true, priority: 1 },
    { id: 'down', classes: ['REASONING'], healthy: false, priority: 0 },
  ], { requiredClass: 'REASONING', requireHealthy: true })
  assert.equal(result.id, 'fast')
})

test('honors provider allow-list', () => {
  const result = routeModel([
    { id: 'a', classes: ['FAST'], healthy: true, priority: 1 },
    { id: 'b', classes: ['FAST'], healthy: true, priority: 2 },
  ], { requiredClass: 'FAST', allowedProviders: ['b'] })
  assert.equal(result.id, 'b')
})
