import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn(), update: vi.fn(), create: vi.fn(), retrieve: vi.fn(), db: vi.fn() }));
vi.mock('@/platform/supabase', () => ({ requireAuthenticatedUser: mocks.auth, getSupabaseServer: mocks.db }));
vi.mock('@/platform/mailing-intent-store', () => ({ createBenefitsIntentStore: () => ({ load: mocks.load, updateStatus: mocks.update }) }));
vi.mock('@/platform/mailmypdf-client', () => ({ mailMyPDFClient: {} }));
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create: mocks.create, retrieve: mocks.retrieve } }; } }));
import { checkoutPayment, returnPayment } from '../../src/platform/payment-handlers';
import { hashDraft, hashRecipient } from '@mailmypdf/payment-fulfillment';
const appealId = '11111111-1111-4111-8111-111111111111';
const approvalId = '22222222-2222-4222-8222-222222222222';
const recipient = { name: 'Agency', address1: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' };
const draft = 'Approved letter';
const intent = { id: approvalId, case_id: appealId, owner_id: 'owner', workflow_id: 'ssdi-denial', status: 'approved', draft_content: draft, recipient, mailing_method: 'certified', approved_draft_hash: hashDraft(draft), approved_recipient_hash: hashRecipient(recipient) };
const request = (body: unknown) => new Request('https://example.test/api/checkout', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
 vi.resetAllMocks(); process.env.STRIPE_SECRET_KEY = 'test';
 mocks.auth.mockResolvedValue({ id: 'owner' }); mocks.load.mockResolvedValue(intent);
 mocks.db.mockResolvedValue({ from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) });
 mocks.create.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/test' });
});
it('rejects unauthenticated checkout before storage or Stripe', async () => {
 mocks.auth.mockRejectedValue(new Error('no token'));
 expect((await checkoutPayment(request({ appealId, approvalId }), 'ssdi-denial')).status).toBe(401);
 expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
});
it('requires approval rather than a client readiness flag', async () => {
 expect((await checkoutPayment(request({ appealId, ready: true }), 'ssdi-denial')).status).toBe(400); expect(mocks.create).not.toHaveBeenCalled();
});
it('rejects another owner', async () => {
 mocks.auth.mockResolvedValue({ id: 'other' });
 expect((await checkoutPayment(request({ appealId, approvalId }), 'ssdi-denial')).status).toBe(404); expect(mocks.create).not.toHaveBeenCalled();
});
it('rejects content changed after approval', async () => {
 mocks.load.mockResolvedValue({ ...intent, draft_content: 'changed' });
 expect((await checkoutPayment(request({ appealId, approvalId }), 'ssdi-denial')).status).toBe(409); expect(mocks.create).not.toHaveBeenCalled();
});
it('uses a server quote and an idempotency key, ignoring client price', async () => {
 const response = await checkoutPayment(request({ appealId, approvalId, price: 1 }), 'ssdi-denial');
 expect(response.status).toBe(200);
 const [params, options] = mocks.create.mock.calls[0];
 expect(params.line_items[0].price_data.unit_amount).toBeGreaterThan(1);
 expect(params.payment_intent_data.metadata.mailing_intent_id).toBe(approvalId);
 expect(options.idempotencyKey).toBe(`benefits-checkout:${approvalId}`);
 expect(params.success_url).toContain('{CHECKOUT_SESSION_ID}');
});
it('does not disclose checkout when session persistence fails', async () => {
 mocks.update.mockRejectedValue(new Error('db failure'));
 expect((await checkoutPayment(request({ appealId, approvalId }), 'ssdi-denial')).status).toBe(502);
});
it('requires authentication on browser return', async () => {
 mocks.auth.mockRejectedValue(new Error('no token'));
 expect((await returnPayment(request({ sessionId: 'cs_1' }))).status).toBe(401); expect(mocks.retrieve).not.toHaveBeenCalled();
});
