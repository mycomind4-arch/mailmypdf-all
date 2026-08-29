import test from 'node:test';
import assert from 'node:assert/strict';
import { canExecute, attachProof } from './fulfillment.js';
import { executeCasePipeline } from './case-pipeline.js';
import { authorize, enforceInputSize, redactSecrets } from './security.js';
import { auditCapabilities } from './green-audit.js';

test('fulfillment requires a non-approved action before execution', () => {
  assert.equal(canExecute({ id:'a', caseId:'c', type:'send', status:'planned', requiresApproval:false, idempotencyKey:'k', input:{} }), true);
});
test('proof closes successful fulfillment', () => {
  const action = { id:'a', caseId:'c', type:'send', status:'executing' as const, requiresApproval:false, idempotencyKey:'k', input:{} };
  assert.equal(attachProof(action, { id:'p', actionId:'a', createdAt:'2026-08-17T00:00:00Z', evidenceRefs:['mail:1'], outcome:'success' }).status, 'completed');
});
test('case pipeline stops action on failed agent task', async () => {
  const result = await executeCasePipeline({ caseId:'c', tasks:[{ id:'t', role:'analyst', objective:'x', modelClass:'REASONING', input:{} }], action:{ id:'a', caseId:'c', type:'send', status:'planned', requiresApproval:false, idempotencyKey:'k', input:{} } }, { execute: async () => ({ taskId:'t', status:'failed' as const }) }, { execute: async (a) => a });
  assert.equal(result.actionStatus, 'planned');
});
test('security guards and redacts', () => {
  assert.doesNotThrow(() => authorize({ actorId:'u', roles:['operator'], scopes:['case:read'] }, { requiredScope:'case:read' }));
  assert.throws(() => authorize({ actorId:'u', roles:[], scopes:[] }, { requiredScope:'case:write' }), /SECURITY_SCOPE_DENIED/);
  assert.throws(() => enforceInputSize({ x:'12345' }, 2), /SECURITY_INPUT_TOO_LARGE/);
  assert.equal(redactSecrets('api_key=abc token=xyz'), 'api_key=[REDACTED] token=[REDACTED]');
});
test('green audit requires zero yellow/red', () => {
  assert.equal(auditCapabilities([{ name:'a', status:'green', evidence:['test'] }]).allGreen, true);
  assert.equal(auditCapabilities([{ name:'a', status:'yellow', evidence:[] }]).allGreen, false);
});
