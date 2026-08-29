import test from 'node:test';
import assert from 'node:assert/strict';
import { finishTelemetry } from './telemetry.js';

test('finishes telemetry with duration and error', () => {
  const event = { id: 'e1', traceId: 't1', kind: 'tool' as const, name: 'case.inspect', status: 'started' as const, startedAt: '2026-08-17T00:00:00.000Z' };
  const finished = finishTelemetry(event, 'failed', '2026-08-17T00:00:01.250Z', { code: 'DENIED', message: 'approval required' });
  assert.equal(finished.durationMs, 1250);
  assert.equal(finished.status, 'failed');
  assert.equal(finished.error?.code, 'DENIED');
});
