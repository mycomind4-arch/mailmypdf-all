import { paymentSessionError } from './payment-session';
import { fulfillMailingIntent } from '@mailmypdf/payment-fulfillment';
import { requireAuthenticatedUser } from './supabase';
import { createAppealMailIntentStore } from './mailing-intent-store';
import { mailMyPDFClient } from './mailmypdf-client';

export async function returnPayment(request: Request) {
  let user;
  try { user = await requireAuthenticatedUser(request); }
  catch { return Response.json({ error: 'Authentication required.' }, { status: 401 }); }
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof input?.sessionId !== 'string' || !input.sessionId || input.sessionId.length > 255) return Response.json({ error: 'Session id required.' }, { status: 400 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: 'Stripe is not configured.' }, { status: 503 });
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(input.sessionId);
    const id = session.metadata?.appeal_id;
    const store = createAppealMailIntentStore();
    const intent = id ? await store.load(id) : null;
    if (!intent || intent.owner_id !== user.id || session.metadata?.owner_user_id !== user.id) return Response.json({ error: 'Mailing not found.' }, { status: 404 });
    const validationError = paymentSessionError(session, intent);
    if (validationError) return Response.json({ error: validationError }, { status: 409 });
    if (session.payment_status !== 'paid') return Response.json({ error: 'Payment has not completed.' }, { status: 409 });
    if (intent.status === 'refunded' || intent.status === 'expired') return Response.json({ error: 'Mailing is no longer payable.' }, { status: 409 });
    const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
    const result = await fulfillMailingIntent(store, mailMyPDFClient, intent.id, session.id, paymentId, 'browser-return', 'appeal-mail');
    return Response.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[appeal-payment-return] Fulfillment failed', error);
    return Response.json({ error: 'Mailing submission failed. Please retry.' }, { status: 500 });
  }
}
