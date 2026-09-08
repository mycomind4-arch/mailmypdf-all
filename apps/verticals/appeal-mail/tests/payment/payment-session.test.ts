import { expect, it } from 'vitest';
import { paymentSessionError } from '../../src/platform/payment-session';
const intent: any = { owner_id: 'u', workflow_id: 'w', approval_id: 'packet', approved_draft_hash: 'draft', approved_recipient_hash: 'recipient', status: 'approved' };
const session = { id: 'cs', payment_status: 'paid', amount_total: 7999, currency: 'usd', metadata: { owner_user_id: 'u', workflow_id: 'w', quote_total_cents: '7999', packet_id: 'packet', approved_draft_hash: 'draft', approved_recipient_hash: 'recipient' } };
it('accepts matching payment and packet', () => { expect(paymentSessionError(session, intent)).toBeNull(); });
it.each([{ owner_id: 'another' }, { workflow_id: 'other' }, { approval_id: 'new-packet' }, { approved_draft_hash: 'changed' }, { approved_recipient_hash: 'changed' }, { status: 'refunded' }, { stripe_session_id: 'other' }])('rejects changed approved intent %j', patch => { expect(paymentSessionError(session, { ...intent, ...patch })).not.toBeNull(); });
it.each([{ amount_total: 1 }, { currency: 'eur' }, { payment_status: 'unpaid' }])('rejects mismatched payment %j', patch => { expect(paymentSessionError({ ...session, ...patch }, intent)).not.toBeNull(); });
