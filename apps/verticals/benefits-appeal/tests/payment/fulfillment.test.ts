import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn(), fulfill: vi.fn() }));
vi.mock('@/platform/mailing-intent-store', () => ({ createBenefitsIntentStore: () => ({ load: mocks.load }) }));
vi.mock('@/platform/mailmypdf-client', () => ({ mailMyPDFClient: {} }));
vi.mock('@/platform/supabase', () => ({ getSupabaseServer: vi.fn(), requireAuthenticatedUser: vi.fn() }));
vi.mock('@mailmypdf/payment-fulfillment', async importOriginal => ({ ...await importOriginal<any>(), fulfillMailingIntent: mocks.fulfill }));
import { fulfillPaidSession } from '../../src/platform/payment-handlers';
const session = { id: 'cs_1', payment_status: 'paid', currency: 'usd', amount_total: 7999, metadata: { mailing_intent_id: 'i1', appeal_id: 'a1', workflow_id: 'ssdi-denial', owner_user_id: 'u1' } };
beforeEach(() => {
 vi.resetAllMocks();
 mocks.load.mockResolvedValue({ id: 'i1', owner_id: 'u1', case_id: 'a1', workflow_id: 'ssdi-denial', status: 'approved', stripe_session_id: 'cs_1', stripe_price_cents: 7999, approved_draft_hash: 'hash', approved_recipient_hash: 'hash' });
 mocks.fulfill.mockResolvedValue({ success: true, providerOrderId: 'order' });
});
it('fulfills a verified payment', async () => { expect((await fulfillPaidSession(session)).success).toBe(true); });
it('rejects unpaid checkout', async () => { await expect(fulfillPaidSession({ ...session, payment_status: 'unpaid' })).rejects.toThrow(/not completed/); expect(mocks.fulfill).not.toHaveBeenCalled(); });
it('rejects another owner on browser return', async () => { await expect(fulfillPaidSession(session, 'other')).rejects.toThrow(/not found/); expect(mocks.fulfill).not.toHaveBeenCalled(); });
it.each([{ amount_total: 1 }, { currency: 'eur' }, { id: 'another-session' }])('rejects mismatched payment %j', async patch => { await expect(fulfillPaidSession({ ...session, ...patch })).rejects.toThrow(); expect(mocks.fulfill).not.toHaveBeenCalled(); });
it('fails for a legacy payment without an approved intent', async () => { await expect(fulfillPaidSession({ ...session, metadata: { appeal_id: 'a1' } })).rejects.toThrow(/approved/); });
it('propagates provider failures for retry', async () => { mocks.fulfill.mockResolvedValue({ success: false }); await expect(fulfillPaidSession(session)).rejects.toMatchObject({ status: 500 }); });
