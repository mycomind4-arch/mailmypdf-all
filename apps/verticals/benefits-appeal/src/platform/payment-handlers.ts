import { z } from 'zod';
import type Stripe from 'stripe';
import { calculateQuote, getWorkflowPricingProfile, LABELS, type MailClass } from '@mailmypdf/pricing';
import { fulfillMailingIntent, verifyIntegrity } from '@mailmypdf/payment-fulfillment';
import { getSupabaseServer, requireAuthenticatedUser } from './supabase';
import { PaymentError, prepareApproval } from './payment-approval';
import { createBenefitsIntentStore } from './mailing-intent-store';
import { mailMyPDFClient } from './mailmypdf-client';

const ids = z.object({ appealId: z.string().uuid(), approvalId: z.string().uuid().optional() });
const store = createBenefitsIntentStore();
async function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new PaymentError('Stripe is not configured.', 503);
  const { default: Stripe } = await import('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
async function authenticated(request: Request) {
  try { return await requireAuthenticatedUser(request); }
  catch { throw new PaymentError('Authentication required.', 401); }
}
export async function paymentResponse(run: () => Promise<Response>) {
  try { return await run(); }
  catch (error) {
    if (error instanceof PaymentError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Invalid request.' }, { status: 400 });
    console.error('[benefits-payment] Operation failed', error);
    return Response.json({ error: 'Payment operation failed. Please retry.' }, { status: 502 });
  }
}
export function approvePayment(request: Request, workflowId: string) {
  return paymentResponse(async () => {
    const user = await authenticated(request);
    const input = await request.json();
    const { appealId } = ids.parse(input);
    const db = await getSupabaseServer();
    const { data: appeal, error } = await db.from('appeals').select('*').eq('id', appealId).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (!appeal) throw new PaymentError('Appeal not found.', 404);
    const approval = prepareApproval(appeal, user.id, workflowId, input);
    const { data, error: insertError } = await db.from('mailing_intents').insert(approval).select('id').single();
    if (insertError || !data) throw insertError || new Error('Approval not saved');
    return Response.json({ ok: true, appealId, approvalId: data.id, review: approval.review });
  });
}
export function checkoutPayment(request: Request, workflowId: string) {
  return paymentResponse(async () => {
    const user = await authenticated(request);
    const input = ids.extend({ approvalId: z.string().uuid() }).parse(await request.json());
    const intent = await store.load(input.approvalId);
    if (!intent || intent.owner_id !== user.id) throw new PaymentError('Approval not found.', 404);
    if (intent.case_id !== input.appealId || intent.workflow_id !== workflowId) throw new PaymentError('Approval does not match this appeal.');
    if (intent.status !== 'approved' || !intent.approved_draft_hash || !intent.approved_recipient_hash || !verifyIntegrity(intent).ok) throw new PaymentError('Approval is not eligible for checkout.');
    const stripe = await stripeClient();
    if (intent.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(intent.stripe_session_id);
      if (session.status !== 'open') throw new PaymentError('Checkout is no longer open.');
      return Response.json({ ok: true, sessionId: session.id, url: session.url });
    }
    const profile = getWorkflowPricingProfile(workflowId);
    if (!profile || profile.commercialStatus !== 'production') throw new PaymentError('This workflow is not available for paid mailing.');
    const method = intent.mailing_method === 'first_class' ? 'standard' : intent.mailing_method;
    const quote = calculateQuote({ workflowId, verticalId: profile.verticalId, actualPages: Math.max(1, Math.ceil(intent.draft_content.length / 3000)), mailClass: method as MailClass });
    const totalCents = intent.stripe_price_cents ?? quote.totalCents;
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new PaymentError('Invalid mailing quote.');
    const db = await getSupabaseServer();
    const { error } = await db.from('mailing_intents').update({ stripe_price_cents: totalCents }).eq('id', intent.id);
    if (error) throw error;
    const metadata = { mailing_intent_id: intent.id, appeal_id: input.appealId, workflow_id: workflowId, owner_user_id: user.id };
    const appUrl = process.env.APP_URL || 'https://benefits-appeal.pages.dev';
    const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', unit_amount: totalCents, product_data: { name: `Benefits Appeal — ${LABELS[method as keyof typeof LABELS]}` } }, quantity: 1 }],
      metadata, payment_intent_data: { metadata },
      success_url: `${appUrl}/workflows/${workflowId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/workflows/${workflowId}?checkout=cancelled`,
    }, { idempotencyKey: `benefits-checkout:${intent.id}` });
    await store.updateStatus(intent.id, { stripe_session_id: session.id });
    return Response.json({ ok: true, sessionId: session.id, url: session.url });
  });
}
export async function fulfillPaidSession(session: Stripe.Checkout.Session, ownerId?: string) {
  if (session.payment_status !== 'paid') throw new PaymentError('Payment has not completed.');
  const id = session.metadata?.mailing_intent_id;
  if (!id) throw new PaymentError('Checkout has no approved mailing reference.');
  const intent = await store.load(id);
  if (!intent || (ownerId && intent.owner_id !== ownerId)) throw new PaymentError('Mailing not found.', 404);
  if (session.metadata?.owner_user_id !== intent.owner_id || session.metadata?.appeal_id !== intent.case_id || session.metadata?.workflow_id !== intent.workflow_id || intent.stripe_session_id !== session.id) throw new PaymentError('Checkout does not match the approved mailing.');
  if (intent.status === 'refunded' || intent.status === 'expired') throw new PaymentError('Mailing is no longer payable.');
  if (session.currency !== 'usd' || session.amount_total !== intent.stripe_price_cents || !intent.stripe_price_cents) throw new PaymentError('Payment amount does not match the approved quote.');
  if (!intent.approved_draft_hash || !intent.approved_recipient_hash) throw new PaymentError('Approval integrity data is missing.');
  const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
  const result = await fulfillMailingIntent(store, mailMyPDFClient, id, session.id, paymentId, ownerId ? 'browser-return' : 'stripe-webhook', 'benefits-appeal');
  if (!result.success) throw new PaymentError('Mailing submission failed. Please retry.', 500);
  return result;
}
export function returnPayment(request: Request) {
  return paymentResponse(async () => {
    const user = await authenticated(request);
    const { sessionId } = z.object({ sessionId: z.string().min(1).max(255) }).parse(await request.json());
    const stripe = await stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return Response.json({ ok: true, ...await fulfillPaidSession(session, user.id) });
  });
}
