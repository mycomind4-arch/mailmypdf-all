import test from 'node:test';
import assert from 'node:assert/strict';
import { runLiveSmoke } from './live-smoke.js';

test('live smoke is green only when every probe passes', async () => {
  const result = await runLiveSmoke([
    { service: 'trigger', probe: async () => ({ ok: true }) },
    { service: 'docling', probe: async () => ({ ok: true }) },
  ], '2026-08-18T00:00:00.000Z');
  assert.equal(result.green, true);
  assert.deepEqual(result.checks.map((x) => x.status), ['pass', 'pass']);
});

test('a failed probe blocks green', async () => {
  const result = await runLiveSmoke([
    { service: 'trigger', probe: async () => ({ ok: true }) },
    { service: 'docling', probe: async () => ({ ok: false, message: 'unreachable' }) },
  ]);
  assert.equal(result.green, false);
  assert.equal(result.checks[1]?.status, 'fail');
});
