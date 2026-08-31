import { describe, expect, it } from 'vitest';
import { assertWorkflowCanSend } from './workflow-gates';

describe('workflow send gates', () => {
  const base = { workflowId: 'payment-demand' as const, recipientId: 'r', documentId: 'd', evidenceCount: 1 };
  it('blocks high-risk workflows without approval', () => expect(() => assertWorkflowCanSend({ ...base, approvalState: 'pending' })).toThrow(/Approval required/));
  it('allows approved high-risk workflows', () => expect(() => assertWorkflowCanSend({ ...base, approvalState: 'approved' })).not.toThrow());
  it('blocks high-risk workflows without evidence', () => expect(() => assertWorkflowCanSend({ ...base, evidenceCount: 0, approvalState: 'approved' })).toThrow(/high-risk correspondence requires evidence/));
  it('allows low-risk payment reminders without approval', () => expect(() => assertWorkflowCanSend({ workflowId: 'payment-reminder', recipientId: 'r', documentId: 'd', approvalState: 'none' })).not.toThrow());
});
