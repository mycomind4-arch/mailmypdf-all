import { createFileRoute } from '@tanstack/react-router'
import {
  fulfillRecordsIntent,
  loadIntent,
  updateIntent,
  verifyStripeSignature,
} from '../../../lib/commerce.server'

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET
        if (!secret) return Response.json({ error: 'Stripe webhook is not configured.' }, { status: 503 })

        const rawBody = await request.text()
        const signature = request.headers.get('stripe-signature') || ''
        if (!(await verifyStripeSignature(rawBody, signature, secret))) {
          return Response.json({ error: 'Invalid Stripe webhook signature.' }, { status: 400 })
        }

        let event: Record<string, any>
        try { event = JSON.parse(rawBody) as Record<string, any> }
        catch { return Response.json({ error: 'Invalid Stripe webhook payload.' }, { status: 400 }) }

        const object = event?.data?.object || {}
        if (event.type === 'checkout.session.completed') {
          if (object.payment_status !== 'paid') return Response.json({ received: true, skipped: true })
          const intentId = String(object.metadata?.mailing_intent_id || '')
          if (!intentId) return Response.json({ received: true, skipped: true, reason: 'missing mailing_intent_id' })

          const intent = await loadIntent(intentId)
          if (!intent) return Response.json({ received: true, skipped: true, reason: 'mailing intent not found' })
          if (object.id !== intent.stripe_session_id || object.metadata?.owner_user_id !== intent.owner_id) {
            return Response.json({ error: 'Stripe session metadata does not match the mailing intent.' }, { status: 409 })
          }
          if (Number(object.amount_total) !== intent.stripe_price_cents) {
            return Response.json({ error: 'Stripe amount does not match the server-authoritative mailing price.' }, { status: 409 })
          }

          const paymentIntentId = typeof object.payment_intent === 'string'
            ? object.payment_intent
            : object.payment_intent?.id ? String(object.payment_intent.id) : null
          const result = await fulfillRecordsIntent(intentId, String(object.id), paymentIntentId)
          return Response.json({ received: true, intentId, ...result }, { status: result.success ? 200 : 502 })
        }

        if (event.type === 'checkout.session.expired') {
          const intentId = String(object.metadata?.mailing_intent_id || '')
          if (intentId) await updateIntent(intentId, { status: 'expired', error_message: 'Stripe checkout session expired.' })
          return Response.json({ received: true, handled: 'checkout.session.expired' })
        }

        if (event.type === 'charge.refunded') {
          const intentId = String(object.metadata?.mailing_intent_id || '')
          if (intentId) await updateIntent(intentId, { status: 'refunded', error_message: 'Payment refunded by Stripe.' })
          return Response.json({ received: true, handled: 'charge.refunded' })
        }

        return Response.json({ received: true, unhandled: event.type })
      },
    },
  },
})
