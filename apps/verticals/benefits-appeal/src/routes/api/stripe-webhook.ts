import { createFileRoute } from '@tanstack/react-router';
import { fulfillPaidSession, paymentResponse } from '@/platform/payment-handlers';
import { createBenefitsIntentStore } from '@/platform/mailing-intent-store';

export const Route = createFileRoute('/api/stripe-webhook')({ server: { handlers: { POST: async ({ request }) => {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature.' }, { status: 400 });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret); }
  catch { return Response.json({ error: 'Invalid signature.' }, { status: 400 }); }
  return paymentResponse(async () => {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') return Response.json({ received: true, skipped: true });
      return Response.json({ received: true, ...await fulfillPaidSession(session) });
    }
    const store = createBenefitsIntentStore();
    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const intent = await store.loadByStripeSession(session.id);
      if (intent && intent.status === 'approved' && !intent.provider_order_id) await store.updateStatus(intent.id, { status: 'expired' });
    }
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const id = charge.metadata?.mailing_intent_id;
      const intent = id ? await store.load(id) : null;
      const paymentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (intent && paymentId === intent.stripe_payment_intent_id && charge.refunded) await store.updateStatus(intent.id, { status: 'refunded' });
    }
    return Response.json({ received: true });
  });
} } } });
