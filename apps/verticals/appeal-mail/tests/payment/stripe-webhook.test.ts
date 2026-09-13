import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ fulfill: vi.fn(), update: vi.fn(), verify: vi.fn(), load: vi.fn(), loadBySession: vi.fn(), gateLoad: vi.fn(), gateUpdate: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@mailmypdf/payment-fulfillment', () => ({ fulfillMailingIntent: mocks.fulfill }));
vi.mock('@/platform/mailing-intent-store', () => ({ createAppealMailIntentStore: () => ({ updateStatus: mocks.update, load: mocks.load, loadByStripeSession: mocks.loadBySession }) }));
vi.mock('@/platform/mailmypdf-client', () => ({ mailMyPDFClient: {} }));
vi.mock('@/platform/payment-session', () => ({ paymentSessionError: () => null }));
vi.mock('@/platform/supabase', () => ({ getSupabaseServer: async () => ({ from: () => ({ select: () => ({ eq: () => ({ single: mocks.gateLoad }) }), update: () => ({ eq: mocks.gateUpdate }) }) }) }));
vi.mock('stripe', () => ({ default: class { webhooks = { constructEventAsync: mocks.verify }; } }));
import { Route } from '../../src/routes/api/stripe-webhook';
const post = () => (Route as any).server.handlers.POST({ request: new Request('https://example.test/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': 'signed' }, body: '{}' }) });
beforeEach(() => {
  vi.resetAllMocks();
  process.env.STRIPE_SECRET_KEY = 'test'; process.env.STRIPE_WEBHOOK_SECRET = 'test';
  mocks.fulfill.mockResolvedValue({ success: true });
});
it('does not mail an unpaid checkout', async () => {
  mocks.verify.mockResolvedValue({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'unpaid', metadata: { appeal_id: 'a1' } } } });
  expect((await post()).status).toBe(200); expect(mocks.fulfill).not.toHaveBeenCalled();
});
it('records a paid draft unlock without submitting mail', async () => {
  mocks.gateLoad.mockResolvedValue({ data: { id: 'g1', owner_id: 'u1', workflow_id: 'insurance-claim-denial', stripe_session_id: 'cs_1', status: 'checkout_open' }, error: null });
  mocks.gateUpdate.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', amount_total: 6999, currency: 'usd', payment_intent: 'pi_1', metadata: { payment_phase: 'draft_unlock', appeal_id: 'a1', owner_user_id: 'u1', workflow_id: 'insurance-claim-denial', quote_total_cents: '6999' } } } });
  expect((await post()).status).toBe(200);
  expect(mocks.fulfill).not.toHaveBeenCalled();
  expect(mocks.gateUpdate).toHaveBeenCalled();
});
it('returns a retryable response when fulfillment fails', async () => {
  mocks.verify.mockResolvedValue({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', metadata: { appeal_id: 'a1' } } } });
  mocks.fulfill.mockResolvedValue({ success: false, error: 'provider unavailable' });
  expect((await post()).status).toBe(500);
});
it('returns a retryable response when storage throws', async () => {
  mocks.verify.mockResolvedValue({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', metadata: { appeal_id: 'a1' } } } });
  mocks.fulfill.mockRejectedValue(new Error('storage unavailable'));
  expect((await post()).status).toBe(500);
});
it('rejects invalid signatures', async () => {
  mocks.verify.mockRejectedValue(new Error('invalid'));
  expect((await post()).status).toBe(400); expect(mocks.fulfill).not.toHaveBeenCalled();
});

it('does not expire a fulfilled mailing', async () => {
  mocks.verify.mockResolvedValue({ type: 'checkout.session.expired', data: { object: { id: 'cs_1' } } });
  mocks.loadBySession.mockResolvedValue({ id: 'a1', status: 'submitted', provider_order_id: 'order' });
  expect((await post()).status).toBe(200); expect(mocks.update).not.toHaveBeenCalled();
});
it('retries failed refund persistence', async () => {
  mocks.verify.mockResolvedValue({ type: 'charge.refunded', data: { object: { refunded: true, payment_intent: 'pi_1', metadata: { appeal_id: 'a1' } } } });
  mocks.load.mockResolvedValue({ id: 'a1', stripe_payment_intent_id: 'pi_1' });
  mocks.update.mockRejectedValue(new Error('storage failure'));
  expect((await post()).status).toBe(500);
});
