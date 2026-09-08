import type { MailingIntent, MailingIntentStore } from '@mailmypdf/payment-fulfillment';
import { getSupabaseServer } from './supabase';

export function createBenefitsIntentStore(): MailingIntentStore {
  async function find(column: string, value: string) {
    const db = await getSupabaseServer();
    const { data, error } = await db.from('mailing_intents').select('*').eq(column, value).maybeSingle();
    if (error) throw new Error('Unable to load mailing intent.');
    return data as MailingIntent | null;
  }
  return {
    load: id => find('id', id),
    loadByStripeSession: id => find('stripe_session_id', id),
    async updateStatus(id, update) {
      const db = await getSupabaseServer();
      const { data, error } = await db.from('mailing_intents').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id).select('id').single();
      if (error || !data) throw new Error('Unable to persist mailing status.');
    },
  };
}
