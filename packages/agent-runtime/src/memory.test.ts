import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRecord, isEvidenceBacked } from './memory.js';

test('creates deterministic timestamps when supplied', () => {
  const record = createMemoryRecord({ id: 'm1', caseId: 'c1', kind: 'fact', value: 'x', confidence: 0.9, sourceRefs: ['doc:1'], now: '2026-08-17T00:00:00Z' });
  assert.equal(record.createdAt, '2026-08-17T00:00:00Z');
  assert.equal(record.updatedAt, record.createdAt);
});

test('requires source references for evidence-backed memory', () => {
  const backed = createMemoryRecord({ id: 'm1', caseId: 'c1', kind: 'fact', value: 'x', confidence: 0.9, sourceRefs: ['doc:1'], now: '2026-08-17T00:00:00Z' });
  const unbacked = { ...backed, sourceRefs: [] };
  assert.equal(isEvidenceBacked(backed), true);
  assert.equal(isEvidenceBacked(unbacked), false);
});
