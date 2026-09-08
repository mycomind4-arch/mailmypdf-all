import type { MailingIntent } from '@mailmypdf/payment-fulfillment';

/** Bind payment to the exact packet that was approved when checkout opened. */
export function paymentSessionError(session: {
  id: string; payment_status?: string; amount_total?: number | null; currency?: string | null;
  metadata?: Record<string, string> | null;
}, intent: MailingIntent | null): string | null {
  if (!intent) return 'Approved mailing not found.';
  if (session.payment_status !== 'paid') return 'Payment has not completed.';
  if (session.metadata?.owner_user_id !== intent.owner_id || session.metadata?.workflow_id !== intent.workflow_id) return 'Payment does not belong to this mailing.';
  if (intent.stripe_session_id && intent.stripe_session_id !== session.id) return 'Checkout session mismatch.';
  if (intent.status === 'expired' || intent.status === 'refunded') return 'Mailing is no longer payable.';
  const amount = Number(session.metadata?.quote_total_cents);
  if (!Number.isSafeInteger(amount) || amount <= 0 || session.amount_total !== amount || session.currency !== 'usd') return 'Payment amount does not match checkout.';
  if (!intent.approved_draft_hash || !intent.approved_recipient_hash) return 'Approval hashes are missing.';
  // Older checkouts did not carry packet hashes. They still require the stored
  // approval hashes; new checkouts additionally bind the payment to that version.
  if (session.metadata?.approved_draft_hash && session.metadata.approved_draft_hash !== intent.approved_draft_hash) return 'Approved draft changed after checkout.';
  if (session.metadata?.approved_recipient_hash && session.metadata.approved_recipient_hash !== intent.approved_recipient_hash) return 'Approved recipient changed after checkout.';
  if (session.metadata?.packet_id && session.metadata.packet_id !== intent.approval_id) return 'Approved packet changed after checkout.';
  return null;
}
