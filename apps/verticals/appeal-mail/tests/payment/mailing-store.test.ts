import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock('@/platform/supabase', () => ({ getSupabaseServer: mocks.db }));
import { createAppealMailIntentStore } from '../../src/platform/mailing-intent-store';
it('propagates storage errors instead of treating unreadable records as absent', async () => {
 const query: any = { select: () => query, eq: () => query, single: async () => ({ data: null, error: { message: 'database unavailable' } }) };
 mocks.db.mockResolvedValue({ from: () => query });
 await expect(createAppealMailIntentStore().load('a1')).rejects.toThrow(/Unable to load/);
});
it('propagates mailing writes that fail so Stripe can retry', async () => {
 const appealQuery: any = { select: () => appealQuery, eq: () => appealQuery, single: async () => ({ data: { id: 'a1', packet: {} }, error: null }) };
 const mailingQuery: any = { select: () => mailingQuery, eq: () => mailingQuery, order: () => mailingQuery, limit: () => mailingQuery, maybeSingle: async () => ({ data: null, error: null }), insert: async () => ({ error: { message: 'write failed' } }) };
 mocks.db.mockResolvedValue({ from: (table: string) => table === 'appeals' ? appealQuery : mailingQuery });
 await expect(createAppealMailIntentStore().updateStatus('a1', { status: 'paid' })).rejects.toThrow(/Unable to create/);
});
