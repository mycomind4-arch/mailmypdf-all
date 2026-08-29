import test from 'node:test';
import assert from 'node:assert/strict';
import { runProductionSmoke } from './production-smoke.js';

test('production smoke reaches governed tool execution', async () => {
  const report = await runProductionSmoke();
  assert.deepEqual(report, { planned: true, agentSucceeded: true, toolSucceeded: true, fulfillmentAllowed: true });
});
