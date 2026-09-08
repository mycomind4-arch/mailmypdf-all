import { expect, it } from 'vitest';
import { prepareApproval } from '../../src/platform/payment-approval';
const recipient = { name: 'Agency', address1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' };
const appeal = { id: 'a', user_id: 'owner', workflow_id: 'ssdi-denial', draft: 'Please reconsider the decision based on the enclosed supporting evidence. Sincerely, Applicant', decision: { facts: [], reasons: [], appealInstructions: 'Send a response' }, evidence: [{ id: 'e', type: 'excerpt', label: 'Evidence', groundIds: ['g'] }], grounds: [{ id: 'g', claim: 'Decision incorrect', confidence: 1 }] };
it('rejects another owner', () => { expect(() => prepareApproval(appeal, 'other', 'ssdi-denial', { recipient, mailingMethod: 'certified' })).toThrow(/own/); });
it('rejects workflow mismatch', () => { expect(() => prepareApproval(appeal, 'owner', 'ssi-denial', { recipient, mailingMethod: 'certified' })).toThrow(/workflow/); });
it('rejects an incomplete recipient', () => { expect(() => prepareApproval(appeal, 'owner', 'ssdi-denial', { recipient: { ...recipient, name: ' ' }, mailingMethod: 'certified' })).toThrow(); });
it('requires server readiness, ignoring a client assertion', () => { expect(() => prepareApproval({ ...appeal, grounds: [] }, 'owner', 'ssdi-denial', { recipient, mailingMethod: 'certified', ready: true })).toThrow(/ready/); });
it('snapshots the stored draft, recipient, method, and hashes', () => {
 const result = prepareApproval(appeal, 'owner', 'ssdi-denial', { recipient, mailingMethod: 'certified' });
 expect(result.draft_content).toBe(appeal.draft); expect(result.approved_draft_hash).toMatch(/^[a-f0-9]{64}$/); expect(result.approved_recipient_hash).toMatch(/^[a-f0-9]{64}$/); expect(result.mailing_method).toBe('certified');
});

it('snapshots the edited draft the user explicitly approves', () => {
 const draft = 'Please reconsider this denial. Here are the facts I reviewed and confirmed. Sincerely, Applicant';
 const result = prepareApproval(appeal, 'owner', 'ssdi-denial', { recipient, mailingMethod: 'certified', draft });
 expect(result.draft_content).toBe(draft);
});
